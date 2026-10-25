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

export interface Board3DProps {
  board: Stack3D[];
  canClick?: (i: number) => boolean;
  onCellClick?: (i: number) => void;
  selected?: number | null;
  last?: number[];
  winLine?: number[] | null;
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

function Piece({ color, level, lift }: { color: 0 | 1; level: number; lift: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const target = MAT_TOP + CUBE / 2 + level * CUBE + (lift ? 0.35 : 0);
  // drop-in animation: start above the board and ease down
  useFrame((_, dt) => {
    const g = ref.current;
    if (g) g.position.y += (target - g.position.y) * Math.min(1, dt * 12);
  });
  return (
    <group ref={ref} position={[0, target + 1.6, 0]}>
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
  i, stack, clickable, selected, last, win, onClick,
}: {
  i: number; stack: Stack3D; clickable: boolean; selected: boolean; last: boolean; win: boolean;
  onClick?: (i: number) => void;
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
        <Piece key={level} color={c} level={level} lift={selected} />
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

/* decorative rows of 8 cubes like the box art: colour faces point at the opponent */
function ShowcaseRows() {
  const rows: (0 | 1)[][] = [
    [0, 0, 1, 0, 0, 0, 1, 0],
    [1, 1, 0, 1, 1, 0, 1, 1],
  ];
  return (
    <>
      {rows.map((row, r) =>
        row.map((c, k) => (
          <group key={`${r}-${k}`} position={[(k - 3.5) * 0.56, CUBE * 0.35, r === 0 ? 3.2 : -3.2]} scale={0.7}>
            <Cube color={c} face={r === 0 ? 'back' : 'front'} />
          </group>
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
  return (
    <group ref={group}>
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
        />
      ))}
      {!props.showcase &&
        [0, 1, 2, 3].map((k) => (
          <group key={k}>
            <Label text={'ABCD'[k]} position={[(k - 1.5) * GAP, MAT_TOP, 2.45]} />
            <Label text={String(k + 1)} position={[-2.45, MAT_TOP, (k - 1.5) * GAP]} />
          </group>
        ))}
      {props.showcase && <ShowcaseRows />}
    </group>
  );
}

export default function Board3D(props: Board3DProps) {
  return (
    <div className={`b3d ${props.className ?? ''}`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: props.showcase ? [0, 7.6, 10.4] : [0, 8.6, 5.2], fov: 38 }}
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
            minDistance={6}
            maxDistance={13}
            minPolarAngle={0.15}
            maxPolarAngle={1.2}
            target={[0, 0.3, 0]}
          />
        )}
      </Canvas>
    </div>
  );
}
