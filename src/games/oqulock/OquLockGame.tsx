import { useEffect, useRef, useState } from 'react';
import {
  type Action, type AIPlan, type Color, type GameState, type Level,
  COLOR_NAME, aiChoose, cellName, movesOf, newGame, step,
} from './logic';
import Board3D from '../../three/Board3D';
import './oqulock.css';

type Mode = 'ai' | 'hot';

export default function OquLockGame() {
  const [mode, setMode] = useState<Mode>('ai');
  const [level, setLevel] = useState<Level>('normal');
  const [game, setGame] = useState<GameState>(newGame);
  const [sel, setSel] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>(['เริ่มเกมใหม่ — แดงเริ่มก่อน']);
  const [handoff, setHandoff] = useState<Color | null>(null);
  const [showResult, setShowResult] = useState(false);
  const plan = useRef<AIPlan | null>(null);

  const who = (p: Color) => (mode === 'ai' ? (p === 0 ? 'คุณ' : 'AI') : `ผู้เล่น ${p + 1}`);
  const isAITurn = mode === 'ai' && game.turn === 1 && game.phase !== 'over';
  const pushLog = (t: string) => setLog((l) => [t, ...l].slice(0, 40));

  function restart(m: Mode = mode) {
    setMode(m);
    setGame(newGame());
    setSel(null);
    setShowResult(false);
    setLog(['เริ่มเกมใหม่ — แดงเริ่มก่อน']);
    setHandoff(m === 'hot' ? 0 : null);
    plan.current = null;
  }

  function act(a: Action) {
    const g = game;
    const next = step(g, a);
    if (next === g) return;
    const me = who(g.turn);
    if (a.type === 'place') {
      const color = g.queues[g.turn][g.queues[g.turn].length - 1];
      pushLog(`${me} วางหมาก${COLOR_NAME[color]} ที่ ${cellName(a.cell)}`);
    } else if (a.type === 'move') {
      const locking = g.board[a.move[1]].length === 1;
      pushLog(`${me} เลื่อน ${cellName(a.move[0])} → ${cellName(a.move[1])}${locking ? ' 🔒 ล็อก!' : ''}`);
    } else pushLog(`${me} ไม่เลื่อนหมาก`);

    if (next.phase === 'over') {
      pushLog(resultTitle(next));
      setShowResult(true);
    } else if (mode === 'hot' && next.turn !== g.turn) setHandoff(next.turn);
    setSel(null);
    setGame(next);
  }

  function resultTitle(g: GameState) {
    if (g.winner === -1) return 'เสมอ!';
    if (mode === 'ai') return g.winner === 0 ? 'คุณชนะ! 🎉' : 'AI ชนะ';
    return `${who(g.winner as Color)} ชนะ! 🎉`;
  }

  // AI turn driver
  useEffect(() => {
    if (!isAITurn) return;
    if (game.phase === 'place') {
      const t = setTimeout(() => {
        plan.current = aiChoose(game, level);
        act({ type: 'place', cell: plan.current.cell });
      }, 650);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      const m = plan.current?.move;
      const legal = m && movesOf(game.board).some(([i, j]) => i === m[0] && j === m[1]);
      act(legal ? { type: 'move', move: m } : { type: 'skip' });
    }, 550);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, isAITurn]);

  const humanCanAct = !isAITurn && game.phase !== 'over' && handoff === null;
  const moves = game.phase === 'move' ? movesOf(game.board) : [];

  function onCell(i: number) {
    if (!humanCanAct) return;
    if (game.phase === 'place') return act({ type: 'place', cell: i });
    if (sel === null) {
      if (moves.some((m) => m[0] === i)) setSel(i);
    } else if (sel === i) setSel(null);
    else if (moves.some((m) => m[0] === sel && m[1] === i)) act({ type: 'move', move: [sel, i] });
    else if (moves.some((m) => m[0] === i)) setSel(i);
  }

  const canClick = (i: number) => {
    if (!humanCanAct) return false;
    if (game.phase === 'place') return game.board[i].length === 0;
    if (sel === null) return moves.some((m) => m[0] === i);
    return moves.some((m) => m[0] === sel && m[1] === i);
  };

  // Who may see a row right now: you never see your own row's colours.
  const queueVisible = (p: Color) =>
    game.phase === 'over' || (mode === 'ai' ? p === 1 : p !== game.turn);

  let status: string;
  if (game.phase === 'over') status = resultTitle(game);
  else if (isAITurn) status = 'AI กำลังคิด…';
  else if (game.phase === 'place') status = `${who(game.turn)}: เลือกช่องว่างเพื่อวางหมากตัวถัดไป`;
  else status = sel === null ? `${who(game.turn)}: เลือกหมากที่จะเลื่อน หรือกดไม่เลื่อน` : `${who(game.turn)}: เลือกช่องปลายทาง`;

  const playerName = (p: Color) =>
    mode === 'ai' ? (p === 0 ? 'คุณ (แดง)' : 'AI (น้ำเงิน)') : `ผู้เล่น ${p + 1} (${COLOR_NAME[p]})`;

  const side = (p: Color) => {
    const q = game.queues[p];
    const vis = queueVisible(p);
    const own = q.filter((c) => c === p).length;
    return (
      <section className={`ol-side ${game.turn === p && game.phase !== 'over' ? 'active' : ''}`}>
        <h2><span className={`ol-dot c${p}`} />{playerName(p)}</h2>
        <div className="ol-sub">{vis ? 'แถวหมาก (มองเห็นได้)' : 'แถวหมาก (สีถูกซ่อน เจ้าของมองไม่เห็น)'}</div>
        <div className="ol-queue">
          {q.length === 0 && <span className="ol-sub">หมากหมดแล้ว</span>}
          {q.map((c, k) => (
            <div key={k} className={`ol-qp ${vis ? 'c' + c : 'h'} ${k === q.length - 1 ? 'next' : ''}`}>{vis ? '' : '?'}</div>
          ))}
        </div>
        <div className="ol-counts">เหลือ {q.length} ตัว · สีตัวเอง {own} / สีคู่แข่ง {q.length - own}</div>
      </section>
    );
  };

  return (
    <div className="ol">
      <div className="ol-toolbar">
        <div className="ol-seg" role="tablist" aria-label="โหมด">
          <button className={mode === 'ai' ? 'on' : ''} onClick={() => restart('ai')}>เล่นกับ AI</button>
          <button className={mode === 'hot' ? 'on' : ''} onClick={() => restart('hot')}>2 คน เครื่องเดียว</button>
        </div>
        {mode === 'ai' && (
          <select value={level} onChange={(e) => setLevel(e.target.value as Level)} aria-label="ระดับ AI">
            <option value="easy">AI: ง่าย</option>
            <option value="normal">AI: ปกติ</option>
          </select>
        )}
        <button className="btn btn-dark" onClick={() => restart()}>เริ่มใหม่</button>
      </div>

      <div className="ol-grid">
        {side(0)}
        <section className="ol-center">
          <div className="ol-status">
            <span>{status}</span>
            <button className="btn" disabled={!(humanCanAct && game.phase === 'move')} onClick={() => act({ type: 'skip' })}>
              ไม่เลื่อน / จบเทิร์น
            </button>
          </div>
          <Board3D
            board={game.board}
            canClick={canClick}
            onCellClick={onCell}
            selected={sel}
            last={game.last}
            winLine={game.winLine}
            className="ol-board3d"
          />
          <p className="ol-hint">ลากเพื่อหมุนมุมมอง · เลื่อนลูกกลิ้งเพื่อซูม · 🔒 วงแหวนทอง = ล็อก</p>
          <div className="ol-log">{log.map((t, k) => <div key={k}>{t}</div>)}</div>
        </section>
        {side(1)}
      </div>

      <details className="ol-rules">
        <summary>วิธีเล่น</summary>
        <ol>
          <li>แต่ละคนมีหมาก 8 ตัว (สีตัวเอง 6 + สีคู่แข่ง 2) สลับแล้วเรียงไว้ <b>คุณมองไม่เห็นสีหมากในแถวของตัวเอง แต่เห็นแถวของคู่แข่ง</b></li>
          <li>หยิบหมากตัวถัดไป (ขอบสีส้ม) ไปวางในช่องว่างบนกระดาน 4×4 สีจะเปิดเผยเมื่อวาง</li>
          <li>ตั้งแต่รอบที่ 2 หลังวางแล้ว เลื่อนหมากบนกระดานได้ 1 ตัว ไปบน/ล่าง/ซ้าย/ขวา 1 ช่อง (ไม่เลื่อนก็ได้)</li>
          <li>ถ้าเลื่อนไปทับหมากอีกตัว ทั้งสองตัวจะ <b>ซ้อนกันและล็อก 🔒</b> เลื่อนไม่ได้อีก (นับสีของตัวบน)</li>
          <li>ใครเรียงสีตัวเองครบ 4 ตัวในแนวตั้งหรือแนวนอนก่อน ชนะ</li>
        </ol>
      </details>

      {handoff !== null && game.phase !== 'over' && (
        <div className="ol-overlay solid">
          <div className="ol-modal">
            <h2>ตาของ{who(handoff)} ({COLOR_NAME[handoff]})</h2>
            <p>ส่งเครื่องให้{who(handoff)} อีกฝ่ายห้ามแอบดูแถวหมาก</p>
            <button className="btn btn-dark" onClick={() => setHandoff(null)}>พร้อมแล้ว</button>
          </div>
        </div>
      )}
      {showResult && (
        <div className="ol-overlay">
          <div className="ol-modal">
            <h2>{resultTitle(game)}</h2>
            <p>{game.winner === -1 ? 'หมากหมดแล้วแต่ยังไม่มีใครเรียงครบ 4' : `เรียง${COLOR_NAME[game.winner as Color]}ครบ 4 ตัว`}</p>
            <div className="ol-modal-actions">
              <button className="btn" onClick={() => setShowResult(false)}>ดูกระดาน</button>
              <button className="btn btn-dark" onClick={() => restart()}>เล่นอีกครั้ง</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
