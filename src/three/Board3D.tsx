import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { ContactShadows, OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

export type Stack3D = (0 | 1)[];

// Matches the physical game: yellow cubes, the player's colour (white / black) printed on one face.
const CUBE_YELLOW = '#f2b316';
const FACE = ['#fbfbf7', '#1d1d1d'] as const; // 0 = white, 1 = black

const N = 4;
const GAP = 1.12;
const CUBE = 0.7;
const MAT_TOP = 0.04; // y of the mat surface
const pos = (i: number): [number, number] => [((i % N) - 1.5) * GAP, (Math.floor(i / N) - 1.5) * GAP];

/* Each player's row of 8 cubes sits on the table in front of them.
   Player 0 sits on the +z side, player 1 on the −z side. Slot k = index in the queue;
   the last slot (the "rightmost" cube from the owner's point of view) is played next. */
const ROW_SCALE = 0.72;
const SLOT = 0.6;
const ROW_Z = 3.35;
const slotPos = (p: 0 | 1, k: number): [number, number, number] => [
  (p === 0 ? 1 : -1) * (k - 3.5) * SLOT,
  (CUBE * ROW_SCALE) / 2,
  p === 0 ? ROW_Z : -ROW_Z,
];

export interface Rows3D {
  queues: [(0 | 1)[], (0 | 1)[]];
  /** whose seat the camera is at — their own row is nearest, colours facing away */
  viewer: 0 | 1;
  /** whose next cube to highlight */
  active?: 0 | 1 | null;
  /** game over: turn every remaining cube colour-up */
  reveal?: boolean;
}

/** where the most recently moved cube came from, so it can fly in from there */
export type Motion = { id: number; cell: number; from: { kind: 'queue'; player: 0 | 1; slot: number } | { kind: 'cell'; cell: number } };

export interface Board3DProps {
  board: Stack3D[];
  canClick?: (i: number) => boolean;
  onCellClick?: (i: number) => void;
  selected?: number | null;
  last?: number[];
  winLine?: number[] | null;
  rows?: Rows3D;
  motion?: Motion | null;
  /** hero mode: slow turntable, no orbit controls, no labels, decorative piece rows */
  showcase?: boolean;
  className?: string;
}

/* ---------- coordinate labels printed on the mat ---------- */
function Label({ text, position }: { text: string; position: [number, number, number] }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = '#6f6f6f';
    g.font = '700 80px "Bai Jamjuree", system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 64, 70);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text]);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.34, 0.34]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  );
}

/* ---------- a cube piece; `face` says which side the colour is printed on ---------- */
function Cube({ color, face = 'top' }: { color: 0 | 1 | null; face?: 'top' | 'front' | 'back' }) {
  const mark = 0.46;
  const facePos: Record<string, [number, number, number]> = {
    top: [0, CUBE / 2 + 0.002, 0], front: [0, 0, CUBE / 2 + 0.002], back: [0, 0, -CUBE / 2 - 0.002],
  };
  const faceRot: Record<string, [number, number, number]> = {
    top: [-Math.PI / 2, 0, 0], front: [0, 0, 0], back: [0, Math.PI, 0],
  };
  return (
    <group>
      <RoundedBox args={[CUBE, CUBE, CUBE]} radius={0.06} smoothness={3} castShadow receiveShadow>
        <meshStandardMaterial color={CUBE_YELLOW} roughness={0.45} />
      </RoundedBox>
      {color !== null && (
        <mesh position={facePos[face]} rotation={faceRot[face]}>
          <planeGeometry args={[mark, mark]} />
          <meshStandardMaterial color={FACE[color]} roughness={0.6} />
        </mesh>
      )}
    </group>
  );
}

function Piece({ color, level, lift, from }: { color: 0 | 1; level: number; lift: boolean; from?: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const target = MAT_TOP + CUBE / 2 + level * CUBE + (lift ? 0.35 : 0);
  // fly in from `from` (a row slot or another cell) with a little arc; otherwise drop from above
  const [start] = useState<[number, number, number]>(() => from ?? [0, target + 1.6, 0]);
  const [arc] = useState(from ? 1 : 0);
  const t = useRef(0);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    if (t.current < 1) {
      t.current = Math.min(1, t.current + dt / (from ? 0.55 : 0.3));
      const e = t.current < 0.5 ? 2 * t.current * t.current : 1 - (-2 * t.current + 2) ** 2 / 2;
      const [sx, sy, sz] = start;
      g.position.set(sx * (1 - e), sy + (target - sy) * e + Math.sin(Math.PI * t.current) * arc, sz * (1 - e));
    } else g.position.y += (target - g.position.y) * Math.min(1, dt * 12);
  });
  return (
    <group ref={ref} position={start}>
      <Cube color={color} />
    </group>
  );
}

/* red "LOCK" badge floating over a locked stack */
function LockBadge() {
  const ref = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = '#e0473c';
    g.beginPath();
    g.roundRect(8, 16, 240, 96, 40);
    g.fill();
    g.fillStyle = '#fff';
    g.font = '800 64px "Bai Jamjuree", system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('LOCK', 128, 68);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useFrame(({ camera, clock }) => {
    if (!ref.current) return;
    ref.current.quaternion.copy(camera.quaternion); // always face the camera
    ref.current.position.y = MAT_TOP + CUBE * 2 + 0.28 + Math.sin(clock.elapsedTime * 3) * 0.03;
  });
  return (
    <mesh ref={ref}>
      <planeGeometry args={[0.62, 0.31]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  );
}

/* pulsing square that marks a cell you can click */
function Marker({ hover }: { hover: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.04 + (hover ? 0.06 : 0);
    ref.current.scale.set(s, s, s);
  });
  return (
    <mesh ref={ref} position={[0, MAT_TOP + 0.012, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
      <ringGeometry args={[0.6, 0.68, 4, 1]} />
      <meshBasicMaterial color={hover ? '#1f9d55' : '#2e8b57'} transparent opacity={hover ? 0.95 : 0.75} />
    </mesh>
  );
}

/* ---------- mat cells ---------- */
function Tile({
  i, stack, clickable, selected, last, win, onClick, spawn,
}: {
  i: number; stack: Stack3D; clickable: boolean; selected: boolean; last: boolean; win: boolean;
  onClick?: (i: number) => void;
  spawn?: [number, number, number];
}) {
  const [hover, setHover] = useState(false);
  const [x, z] = pos(i);
  const dark = (i % N + Math.floor(i / N)) % 2 === 1;
  const base = win ? '#f3d66b' : clickable && hover ? '#d9efe1' : dark ? '#8f8f8f' : '#b8b8b8';
  const emissive = selected || last ? '#e08a12' : '#000000';
  const emissiveIntensity = selected ? 0.45 : last ? 0.3 : 0;

  const handlers = onClick
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (clickable) onClick(i); },
        onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHover(true); document.body.style.cursor = clickable ? 'pointer' : ''; },
        onPointerOut: () => { setHover(false); document.body.style.cursor = ''; },
      }
    : {};

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, MAT_TOP - 0.01, 0]} receiveShadow {...handlers}>
        <boxGeometry args={[GAP, 0.02, GAP]} />
        <meshStandardMaterial color={base} emissive={emissive} emissiveIntensity={emissiveIntensity} roughness={0.9} />
      </mesh>
      {stack.map((c, level) => (
        <Piece key={level} color={c} level={level} lift={selected} from={level === stack.length - 1 ? spawn : undefined} />
      ))}
      {stack.length === 2 && <LockBadge />}
      {clickable && <Marker hover={hover} />}
      {/* invisible hit box so clicking a cube also targets its cell */}
      {onClick && stack.length > 0 && (
        <mesh position={[0, MAT_TOP + (CUBE * stack.length) / 2, 0]} {...handlers}>
          <boxGeometry args={[0.9, CUBE * stack.length + 0.05, 0.9]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/* one cube in a player's row; colour face points at the opponent until reveal */
function RowCube({ p, k, color, next, reveal }: { p: 0 | 1; k: number; color: 0 | 1; next: boolean; reveal: boolean }) {
  const lift = useRef<THREE.Group>(null);
  const flip = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const a = Math.min(1, dt * 8);
    if (lift.current) lift.current.position.y += ((next ? 0.14 : 0) - lift.current.position.y) * a;
    if (flip.current) flip.current.rotation.x += ((reveal ? -Math.PI / 2 : 0) - flip.current.rotation.x) * a;
  });
  return (
    <group position={slotPos(p, k)} rotation={[0, p === 0 ? Math.PI : 0, 0]}>
      {next && (
        <mesh position={[0, -(CUBE * ROW_SCALE) / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
          <ringGeometry args={[0.36, 0.42, 4, 1]} />
          <meshBasicMaterial color="#e08a12" />
        </mesh>
      )}
      <group ref={lift}>
        <group ref={flip} scale={ROW_SCALE}>
          <Cube color={color} face="front" />
        </group>
      </group>
    </group>
  );
}

function PlayerRows({ rows }: { rows: Rows3D }) {
  return (
    <>
      {([0, 1] as const).map((p) =>
        rows.queues[p].map((c, k) => (
          <RowCube
            key={`${p}-${k}`}
            p={p}
            k={k}
            color={c}
            next={!rows.reveal && rows.active === p && k === rows.queues[p].length - 1}
            reveal={!!rows.reveal}
          />
        )),
      )}
    </>
  );
}

function BoardModel(props: Board3DProps) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (props.showcase && group.current) {
      const t = state.clock.elapsedTime;
      group.current.rotation.y = t * 0.25;
    }
  });
  // where the newest cube flew in from, relative to its destination cell
  const m = props.motion;
  let spawn: [number, number, number] | undefined;
  if (m) {
    const [cx, cz] = pos(m.cell);
    if (m.from.kind === 'queue') {
      const [x, y, z] = slotPos(m.from.player, m.from.slot);
      spawn = [x - cx, y + MAT_TOP, z - cz];
    } else {
      const [fx, fz] = pos(m.from.cell);
      spawn = [fx - cx, MAT_TOP + CUBE / 2, fz - cz]; // moved cubes always start at ground level
    }
  }
  return (
    <group ref={group} rotation={[0, !props.showcase && props.rows?.viewer === 1 ? Math.PI : 0, 0]}>
      {/* game mat */}
      <RoundedBox args={[5.3, 0.06, 5.3]} radius={0.03} smoothness={2} position={[0, 0, 0]} receiveShadow>
        <meshStandardMaterial color="#f4f2ec" roughness={0.9} />
      </RoundedBox>
      {props.board.map((stack, i) => (
        <Tile
          key={i}
          i={i}
          stack={stack}
          clickable={props.canClick?.(i) ?? false}
          selected={props.selected === i}
          last={props.last?.includes(i) ?? false}
          win={props.winLine?.includes(i) ?? false}
          onClick={props.onCellClick}
          spawn={m && m.cell === i ? spawn : undefined}
        />
      ))}
      {!props.showcase &&
        [0, 1, 2, 3].map((k) => (
          <group key={k}>
            <Label text={'ABCD'[k]} position={[(k - 1.5) * GAP, MAT_TOP, 2.45]} />
            <Label text={String(k + 1)} position={[-2.45, MAT_TOP, (k - 1.5) * GAP]} />
          </group>
        ))}
      {props.rows && <PlayerRows rows={props.rows} />}
    </group>
  );
}

export default function Board3D(props: Board3DProps) {
  return (
    <div className={`b3d ${props.className ?? ''}`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: props.showcase ? [0, 7.6, 10.4] : [0, 8.3, 6.7], fov: 40 }}
        onPointerMissed={() => (document.body.style.cursor = '')}
      >
        <ambientLight intensity={0.6} />
        <hemisphereLight args={['#fffaf0', '#6b6b6b', 0.5]} />
        <directionalLight
          position={[4, 9, 5]}
          intensity={1.5}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
        />
        <BoardModel {...props} />
        <ContactShadows position={[0, -0.04, 0]} opacity={0.35} scale={12} blur={2.4} far={3} />
        {!props.showcase && (
          <OrbitControls
            enablePan={false}
            minDistance={7}
            maxDistance={15}
            minPolarAngle={0.2}
            maxPolarAngle={1.15}
            // stay on your own side of the table so you can't peek at your own row's colours
            minAzimuthAngle={-0.75}
            maxAzimuthAngle={0.75}
            target={[0, 0, 0.35]}
          />
        )}
      </Canvas>
    </div>
  );
}
