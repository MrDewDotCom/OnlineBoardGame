// Decorative 2D board (game cards, featured section, fallback while 3D loads).
// Cells: 0 = white, 1 = black, 2 = locked (white on top), 3 = locked (black on top), null = empty
type Cell = 0 | 1 | 2 | 3 | null;

const DEFAULT: Cell[] = [
  null, 0, null, 1,
  1, 2, 0, null,
  null, 0, 3, null,
  1, null, 0, null,
];

export default function MiniBoard({ cells = DEFAULT, className = '' }: { cells?: Cell[]; className?: string }) {
  return (
    <div className={`mini-board ${className}`} aria-hidden="true">
      {cells.map((c, i) => (
        <div key={i} className={`mini-cell ${(i % 4 + Math.floor(i / 4)) % 2 ? 'dk' : ''}`} style={{ animationDelay: `${i * 40}ms` }}>
          {c !== null && (
            <span className={`mini-cube ${c === 0 || c === 2 ? 'w' : 'k'} ${c >= 2 ? 'lk' : ''}`}>
              {c >= 2 && <em>LOCK</em>}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
