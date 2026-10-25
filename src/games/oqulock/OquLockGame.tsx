import { useEffect, useRef, useState } from 'react';
import {
  type Action, type AIPlan, type Color, type GameState, type Level,
  COLOR_NAME, aiChoose, cellName, movesOf, newGame, step,
} from './logic';
import Board3D, { type Motion } from '../../three/Board3D';
import './oqulock.css';

type Mode = 'ai' | 'hot';

export default function OquLockGame() {
  const [mode, setMode] = useState<Mode>('ai');
  const [level, setLevel] = useState<Level>('normal');
  const [game, setGame] = useState<GameState>(newGame);
  const [sel, setSel] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>(['เริ่มเกมใหม่ — ขาวเริ่มก่อน']);
  const [handoff, setHandoff] = useState<Color | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [motion, setMotion] = useState<Motion | null>(null);
  const plan = useRef<AIPlan | null>(null);

  const who = (p: Color) => (mode === 'ai' ? (p === 0 ? 'คุณ' : 'AI') : `ผู้เล่น ${p + 1}`);
  const isAITurn = mode === 'ai' && game.turn === 1 && game.phase !== 'over';
  const pushLog = (t: string) => setLog((l) => [t, ...l].slice(0, 40));

  function restart(m: Mode = mode) {
    setMode(m);
    setGame(newGame());
    setSel(null);
    setShowResult(false);
    setLog(['เริ่มเกมใหม่ — ขาวเริ่มก่อน']);
    setHandoff(m === 'hot' ? 0 : null);
    setMotion(null);
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
      setMotion({ id: Date.now(), cell: a.cell, from: { kind: 'queue', player: g.turn, slot: g.queues[g.turn].length - 1 } });
    } else if (a.type === 'move') {
      const locking = g.board[a.move[1]].length === 1;
      pushLog(`${me} เลื่อน ${cellName(a.move[0])} → ${cellName(a.move[1])}${locking ? ' 🔒 ล็อก!' : ''}`);
      setMotion({ id: Date.now(), cell: a.move[1], from: { kind: 'cell', cell: a.move[0] } });
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

  // Seat the camera at: in hot-seat it follows the player whose turn it is
  const viewer: Color = mode === 'ai' ? 0 : game.turn;

  let status: string;
  if (game.phase === 'over') status = resultTitle(game);
  else if (isAITurn) status = 'AI กำลังคิด…';
  else if (game.phase === 'place') status = `${who(game.turn)}: เลือกช่องว่างเพื่อวางหมากตัวถัดไป`;
  else status = sel === null ? `${who(game.turn)}: เลือกหมากที่จะเลื่อน หรือกดไม่เลื่อน` : `${who(game.turn)}: เลือกช่องปลายทาง`;

  const playerName = (p: Color) =>
    mode === 'ai' ? (p === 0 ? 'คุณ (ขาว)' : 'AI (ดำ)') : `ผู้เล่น ${p + 1} (${COLOR_NAME[p]})`;

  const side = (p: Color) => {
    const q = game.queues[p];
    const own = q.filter((c) => c === p).length;
    const seat = p === viewer ? 'แถวหน้าคุณ (เห็นแต่ด้านหลัง)' : 'แถวฝั่งตรงข้าม (เห็นสี)';
    return (
      <section className={`ol-side ${game.turn === p && game.phase !== 'over' ? 'active' : ''}`}>
        <h2><span className={`ol-dot c${p}`} />{playerName(p)}</h2>
        <div className="ol-sub">{game.phase === 'over' ? 'เปิดสีทุกลูกแล้ว' : seat}</div>
        <div className="ol-counts">เหลือ {q.length} ลูก · สีตัวเอง {own} / สีคู่แข่ง {q.length - own}</div>
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
            motion={motion}
            rows={{
              queues: game.queues,
              viewer,
              active: game.phase === 'place' ? game.turn : null,
              reveal: game.phase === 'over',
            }}
            className="ol-board3d"
          />
          <p className="ol-hint">แถวด้านหน้า = ของคุณ (สีหันออก) · แถวด้านหลัง = ของคู่แข่ง · ลากเพื่อหมุน · เลื่อนลูกกลิ้งเพื่อซูม</p>
          <div className="ol-log">{log.map((t, k) => <div key={k}>{t}</div>)}</div>
        </section>
        {side(1)}
      </div>

      <details className="ol-rules">
        <summary>วิธีเล่น</summary>
        <ol>
          <li>หมากเป็นลูกบาศก์สีเหลือง มีสี (ขาว/ดำ) อยู่ด้านเดียว แต่ละคนมี 8 ลูก (สีตัวเอง 6 + สีคู่แข่ง 2) สลับแล้วเรียงโดยหันด้านสีไปทางคู่แข่ง <b>คุณจึงมองไม่เห็นสีในแถวตัวเอง แต่เห็นแถวของคู่แข่ง</b></li>
          <li>หยิบลูกขวาสุดในแถวของคุณ (มีกรอบสีส้ม) ไปวางในช่องว่างบนแผ่นกระดาน 4×4 โดยหงายด้านสีขึ้น</li>
          <li>ตั้งแต่รอบที่ 2 หลังวางแล้ว เลื่อนหมากบนกระดานได้ 1 ตัว ไปบน/ล่าง/ซ้าย/ขวา 1 ช่อง (ไม่เลื่อนก็ได้)</li>
          <li>ถ้าเลื่อนไปทับหมากอีกตัว ทั้งสองตัวจะ <b>ซ้อนกันและล็อก (LOCK)</b> เลื่อนไม่ได้อีก (นับสีของลูกบน)</li>
          <li>ใครต่อสีตัวเองติดกันครบ 4 ช่อง (ต่อกันด้านข้าง ไม่นับแนวทแยง) ก่อนชนะ — มีรูปแบบชนะ 7 แบบ: แถวตรง, สี่เหลี่ยม, ตัว T, S, Z, L และ J</li>
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
            <p>{game.winner === -1 ? 'หมากหมดแล้วแต่ยังไม่มีใครต่อครบ 4' : `ต่อสี${COLOR_NAME[game.winner as Color]}ติดกันครบ 4 ช่อง`}</p>
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
