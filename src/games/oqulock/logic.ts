// Pure game logic for 4 OQU LOCK (no React here, so it can be reused by an online server later)

export type Color = 0 | 1;
export type Stack = Color[]; // bottom → top, max length 2
export type Board = Stack[]; // 16 cells, index = row * 4 + col
export type Move = [from: number, to: number];
export type Phase = 'place' | 'move' | 'over';

export const N = 4;
export const COLOR_NAME = ['แดง', 'น้ำเงิน'] as const;

export const LINES: number[][] = [
  ...[0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => r * N + c)),
  ...[0, 1, 2, 3].map((c) => [0, 1, 2, 3].map((r) => r * N + c)),
];

export interface GameState {
  board: Board;
  queues: [Color[], Color[]]; // last element = next piece ("rightmost")
  turn: Color;
  turnsPlayed: [number, number];
  phase: Phase;
  last: number[];
  winner: Color | -1 | null; // -1 = draw
  winLine: number[] | null;
}

export type Action = { type: 'place'; cell: number } | { type: 'move'; move: Move } | { type: 'skip' };

const shuffle = <T,>(a: T[]): T[] => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function newGame(): GameState {
  const makeQueue = (p: Color): Color[] =>
    shuffle([...Array<Color>(6).fill(p), ...Array<Color>(2).fill((1 - p) as Color)]);
  return {
    board: Array.from({ length: 16 }, () => []),
    queues: [makeQueue(0), makeQueue(1)],
    turn: 0,
    turnsPlayed: [0, 0],
    phase: 'place',
    last: [],
    winner: null,
    winLine: null,
  };
}

export const top = (s: Stack): Color | -1 => (s.length ? s[s.length - 1] : -1);
export const cloneBoard = (b: Board): Board => b.map((s) => s.slice());
export const cellName = (i: number) => 'ABCD'[i % N] + (Math.floor(i / N) + 1);

export function lineOf(board: Board, color: Color): number[] | null {
  return LINES.find((L) => L.every((i) => top(board[i]) === color)) ?? null;
}

export function movesOf(board: Board): Move[] {
  const out: Move[] = [];
  for (let i = 0; i < 16; i++) {
    if (board[i].length !== 1) continue; // empty or locked
    const r = Math.floor(i / N);
    const c = i % N;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
      const j = nr * N + nc;
      if (board[j].length < 2) out.push([i, j]);
    }
  }
  return out;
}

export function applyMove(board: Board, [i, j]: Move) {
  board[j].push(board[i].pop()!);
}

/** Winner after a full turn by `mover`; the mover's line wins ties. */
export function judge(board: Board, mover: Color): Color | null {
  if (lineOf(board, mover)) return mover;
  const other = (1 - mover) as Color;
  if (lineOf(board, other)) return other;
  return null;
}

function finish(s: GameState, w: Color | -1): GameState {
  return { ...s, phase: 'over', winner: w, winLine: w >= 0 ? lineOf(s.board, w as Color) : null };
}

function endTurn(s: GameState): GameState {
  const w = judge(s.board, s.turn);
  if (w !== null) return finish(s, w);
  const turnsPlayed: [number, number] = [...s.turnsPlayed];
  turnsPlayed[s.turn]++;
  if (!s.queues[0].length && !s.queues[1].length) return finish({ ...s, turnsPlayed }, -1);
  return { ...s, turnsPlayed, turn: (1 - s.turn) as Color, phase: 'place' };
}

/** Apply one action, returning a new state (or the same state if the action is illegal). */
export function step(s: GameState, a: Action): GameState {
  if (s.phase === 'over') return s;
  if (a.type === 'place') {
    if (s.phase !== 'place' || s.board[a.cell].length) return s;
    const board = cloneBoard(s.board);
    const queues: [Color[], Color[]] = [s.queues[0].slice(), s.queues[1].slice()];
    const color = queues[s.turn].pop()!;
    board[a.cell].push(color);
    const next: GameState = { ...s, board, queues, last: [a.cell] };
    if (lineOf(board, s.turn)) return finish(next, s.turn); // own line on placement wins immediately
    if (s.turnsPlayed[s.turn] === 0 || movesOf(board).length === 0) return endTurn(next);
    return { ...next, phase: 'move' };
  }
  if (s.phase !== 'move') return s;
  if (a.type === 'skip') return endTurn(s);
  if (!movesOf(s.board).some(([i, j]) => i === a.move[0] && j === a.move[1])) return s;
  const board = cloneBoard(s.board);
  applyMove(board, a.move);
  return endTurn({ ...s, board, last: [a.move[1]] });
}

/* ------------------------------ AI ------------------------------ */

export type Level = 'easy' | 'normal';
export interface AIPlan {
  cell: number;
  move: Move | null;
}

function evalBoard(b: Board, me: Color): number {
  const W = [0, 1, 5, 25, 0];
  let s = 0;
  for (const L of LINES) {
    let m = 0;
    let o = 0;
    let lockM = 0;
    for (const i of L) {
      const t = top(b[i]);
      if (t === me) {
        m++;
        if (b[i].length === 2) lockM++;
      } else if (t !== -1) o++;
    }
    if (o === 0) s += W[m] + lockM * 0.5;
    if (m === 0) s -= W[o] * 1.2;
  }
  return s;
}

function canWinNext(b: Board, player: Color, piece: Color, allowMove: boolean): boolean {
  for (let p = 0; p < 16; p++) {
    if (b[p].length) continue;
    const b1 = cloneBoard(b);
    b1[p].push(piece);
    if (lineOf(b1, player)) return true;
    if (!allowMove) continue;
    for (const m of movesOf(b1)) {
      const b2 = cloneBoard(b1);
      applyMove(b2, m);
      if (judge(b2, player) === player) return true;
    }
  }
  return false;
}

/**
 * The AI does not know the colour of its own next piece (same as a human),
 * so it scores each plan by expected value over the colours left in its row.
 * It *does* see the opponent's row, which the rules allow.
 */
export function aiChoose(s: GameState, level: Level): AIPlan {
  const me = s.turn;
  const opp = (1 - me) as Color;
  const q = s.queues[me];
  const pOwn = q.filter((c) => c === me).length / q.length;
  const allowMove = s.turnsPlayed[me] > 0;
  const oppQ = s.queues[opp];
  const oppNext = oppQ.length ? oppQ[oppQ.length - 1] : null;

  type Part = { prob: number; board: Board; w: Color | null };
  const plans = new Map<string, AIPlan & { score: number; parts: Part[] }>();

  for (const color of [me, opp] as Color[]) {
    const prob = color === me ? pOwn : 1 - pOwn;
    if (prob === 0) continue;
    for (let p = 0; p < 16; p++) {
      if (s.board[p].length) continue;
      const b1 = cloneBoard(s.board);
      b1[p].push(color);
      const options: { move: Move | null; board: Board; w: Color | null }[] = [];
      if (lineOf(b1, me)) options.push({ move: null, board: b1, w: me });
      else {
        options.push({ move: null, board: b1, w: judge(b1, me) });
        if (allowMove)
          for (const m of movesOf(b1)) {
            const b2 = cloneBoard(b1);
            applyMove(b2, m);
            options.push({ move: m, board: b2, w: judge(b2, me) });
          }
      }
      for (const o of options) {
        const key = `${p}|${o.move ? o.move.join(',') : '-'}`;
        const v = o.w === me ? 10000 : o.w === opp ? -10000 : evalBoard(o.board, me);
        let plan = plans.get(key);
        if (!plan) plans.set(key, (plan = { cell: p, move: o.move, score: 0, parts: [] }));
        plan.score += prob * v;
        plan.parts.push({ prob, board: o.board, w: o.w });
      }
    }
  }

  const noise = level === 'easy' ? 8 : 0.6;
  let list = [...plans.values()];
  list.forEach((x) => (x.score += Math.random() * noise));
  list.sort((a, b) => b.score - a.score);

  if (level === 'normal' && oppNext !== null) {
    list = list.slice(0, 30);
    for (const x of list)
      for (const part of x.parts)
        if (part.w === null && canWinNext(part.board, opp, oppNext, s.turnsPlayed[opp] > 0))
          x.score -= 5000 * part.prob;
    list.sort((a, b) => b.score - a.score);
  }
  return { cell: list[0].cell, move: list[0].move };
}
