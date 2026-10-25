import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { ContactShadows, OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

export type Stack3D = (0 | 1)[];

const PIECE_COLORS = ['#d6453d', '#2f6fd0'] as const;
const PIECE_DARK = ['#8f241f', '#1a417f'] as const;

const N = 4;
const GAP = 1.12;
const PIECE_H = 0.24;
const TILE_TOP = 0.2; // y of tile surface
const pos = (i: number): [number, number] => [((i % N) - 1.5) * GAP, (Math.floor(i / N) - 1.5) * GAP];

export interface Board3DProps {
  board: Stack3D[];
  canClick?: (i: number) => boolean;
  onCellClick?: (i: number) => void;
  selected?: number | null;
  last?: number[];
  winLine?: number[] | null;
  /** hero mode: slow turntable, no orbit controls, no labels */
  showcase?: boolean;
  className?: string;
}

/* ---------- coordinate labels (flat on the table) ---------- */
function Label({ text, position }: { text: string; position: [number, number, number] }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = '#7b6d60';
    g.font = '700 84px "Bai Jamjuree", system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 64, 70);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text]);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.42, 0.42]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  );
}

/* ---------- pieces ---------- */
function Piece({ color, level, locked, lift }: { color: 0 | 1; level: number; locked: boolean; lift: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const target = TILE_TOP + PIECE_H / 2 + level * PIECE_H + (lift ? 0.35 : 0);
  // drop-in animation: start above the board and ease down
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    g.position.y += (target - g.position.y) * Math.min(1, dt * 12);
  });
  return (
    <group ref={ref} position={[0, target + 1.6, 0]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.38, 0.4, PIECE_H, 40]} />
        <meshStandardMaterial color={PIECE_COLORS[color]} roughness={0.35} metalness={0.05} />
      </mesh>
      {/* dimple on top so pieces read as game tokens */}
      <mesh position={[0, PIECE_H / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.27, 40]} />
        <meshStandardMaterial color={PIECE_DARK[color]} roughness={0.5} />
      </mesh>
      {locked && (
        <mesh position={[0, -PIECE_H / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.44, 0.045, 12, 48]} />
          <meshStandardMaterial color="#e8b931" metalness={0.8} roughness={0.25} emissive="#7a5a00" emissiveIntensity={0.3} />
        </mesh>
      )}
    </group>
  );
}

/* pulsing ring that marks a cell you can click */
function Marker({ hover, occupied }: { hover: boolean; occupied: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.05 + (hover ? 0.08 : 0);
    ref.current.scale.set(s, s, s);
  });
  return (
    <mesh ref={ref} position={[0, TILE_TOP + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[occupied ? 0.43 : 0.3, occupied ? 0.48 : 0.36, 48]} />
      <meshBasicMaterial color={hover ? '#1f9d55' : '#2e8b57'} transparent opacity={hover ? 0.95 : 0.7} />
    </mesh>
  );
}

/* ---------- tiles ---------- */
function Tile({
  i, stack, clickable, selected, last, win, onClick,
}: {
  i: number; stack: Stack3D; clickable: boolean; selected: boolean; last: boolean; win: boolean;
  onClick?: (i: number) => void;
}) {
  const [hover, setHover] = useState(false);
  const [x, z] = pos(i);
  const base = win ? '#f3d66b' : clickable ? (hover ? '#fff1cf' : '#f6e3bb') : '#e7c995';
  const emissive = selected ? '#e08a12' : clickable ? '#2e8b57' : last ? '#e08a12' : '#000000';
  const emissiveIntensity = selected ? 0.5 : clickable ? (hover ? 0.3 : 0.12) : last ? 0.3 : 0;

  const handlers = onClick
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (clickable) onClick(i); },
        onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHover(true); document.body.style.cursor = clickable ? 'pointer' : ''; },
        onPointerOut: () => { setHover(false); document.body.style.cursor = ''; },
      }
    : {};

  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[1, 0.1, 1]} radius={0.04} smoothness={3} position={[0, TILE_TOP - 0.05, 0]} receiveShadow {...handlers}>
        <meshStandardMaterial color={base} emissive={emissive} emissiveIntensity={emissiveIntensity} roughness={0.75} />
      </RoundedBox>
      {stack.map((c, level) => (
        <Piece key={level} color={c} level={level} locked={stack.length === 2} lift={selected} />
      ))}
      {clickable && <Marker hover={hover} occupied={stack.length > 0} />}
      {/* invisible hit area above the tile so clicking a piece also targets the cell */}
      {onClick && stack.length > 0 && (
        <mesh position={[0, TILE_TOP + PIECE_H * stack.length / 2, 0]} {...handlers}>
          <cylinderGeometry args={[0.45, 0.45, PIECE_H * stack.length + 0.05, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function BoardModel(props: Board3DProps) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (props.showcase && group.current) {
      const t = state.clock.elapsedTime;
      group.current.rotation.y = t * 0.25;
      group.current.position.y = Math.sin(t * 1.2) * 0.06;
    }
  });
  return (
    <group ref={group}>
      {/* wooden board */}
      <RoundedBox args={[4.9, 0.3, 4.9]} radius={0.12} smoothness={4} position={[0, -0.05, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#b98a4e" roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[4.6, 0.06, 4.6]} radius={0.05} position={[0, 0.12, 0]} receiveShadow>
        <meshStandardMaterial color="#9c7038" roughness={0.8} />
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
            <Label text={'ABCD'[k]} position={[(k - 1.5) * GAP, -0.19, 2.75]} />
            <Label text={String(k + 1)} position={[-2.75, -0.19, (k - 1.5) * GAP]} />
          </group>
        ))}
    </group>
  );
}

export default function Board3D(props: Board3DProps) {
  return (
    <div className={`b3d ${props.className ?? ''}`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: props.showcase ? [0, 6.2, 8.2] : [0, 8.4, 4.9], fov: 38 }}
        onPointerMissed={() => (document.body.style.cursor = '')}
      >
        <ambientLight intensity={0.55} />
        <hemisphereLight args={['#fff6e5', '#5a4630', 0.5]} />
        <directionalLight
          position={[4, 8, 5]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-4}
          shadow-camera-right={4}
          shadow-camera-top={4}
          shadow-camera-bottom={-4}
        />
        <BoardModel {...props} />
        <ContactShadows position={[0, -0.22, 0]} opacity={0.45} scale={10} blur={2.4} far={3} />
        {!props.showcase && (
          <OrbitControls
            enablePan={false}
            minDistance={6}
            maxDistance={12}
            minPolarAngle={0.15}
            maxPolarAngle={1.2}
            target={[0, 0, 0]}
          />
        )}
      </Canvas>
    </div>
  );
}
