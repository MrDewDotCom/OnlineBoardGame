// Decorative 4×4 board used on the landing page and game cards.
// Cells: 0 = red, 1 = blue, 2 = locked red-on-blue, 3 = locked blue-on-red, null = empty
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
        <div key={i} className="mini-cell" style={{ animationDelay: `${i * 40}ms` }}>
          {c !== null && (
            <span className={`mini-piece ${c === 0 || c === 2 ? 'r' : 'b'} ${c === 2 ? 'lk lb' : c === 3 ? 'lk lr' : ''}`} />
          )}
        </div>
      ))}
    </div>
  );
}
