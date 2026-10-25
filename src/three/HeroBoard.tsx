import { useEffect, useState } from 'react';
import Board3D, { type Stack3D } from './Board3D';

// A short scripted "demo game" that loops on the landing page.
type Step = { place: [number, 0 | 1] } | { move: [number, number] };
const SCRIPT: Step[] = [
  { place: [5, 0] }, { place: [6, 1] }, { place: [9, 0] }, { place: [3, 1] },
  { place: [10, 1] }, { move: [6, 5] }, { place: [1, 0] }, { place: [12, 1] },
  { place: [13, 0] }, { move: [10, 9] }, { place: [14, 1] }, { place: [7, 0] },
];

const empty = (): Stack3D[] => Array.from({ length: 16 }, () => []);

export default function HeroBoard() {
  const [board, setBoard] = useState<Stack3D[]>(empty);
  const [k, setK] = useState(0);
  const [last, setLast] = useState<number[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (k >= SCRIPT.length) {
        setBoard(empty());
        setLast([]);
        setK(0);
        return;
      }
      const s = SCRIPT[k];
      setBoard((b) => {
        const nb = b.map((x) => x.slice());
        if ('place' in s) nb[s.place[0]].push(s.place[1]);
        else nb[s.move[1]].push(nb[s.move[0]].pop()!);
        return nb;
      });
      setLast(['place' in s ? s.place[0] : s.move[1]]);
      setK(k + 1);
    }, k >= SCRIPT.length ? 2600 : 900);
    return () => clearTimeout(t);
  }, [k]);

  return <Board3D board={board} last={last} showcase className="hero-3d" />;
}
