import { Link } from 'react-router-dom';
import MiniBoard from '../components/MiniBoard';
import { GAMES } from '../games/registry';

export default function GameSelect() {
  return (
    <section className="page">
      <div className="page-head">
        <p className="eyebrow">ห้องเกม</p>
        <h1>เลือกเกมที่จะเล่น</h1>
        <p className="lead">คลิกที่เกมเพื่อเริ่ม แต่ละเกมเลือกโหมดได้ว่าจะเล่นกับ AI หรือเล่นกับเพื่อน</p>
      </div>

      <div className="game-grid">
        {GAMES.map((g) => (
          <Link key={g.slug} to={`/games/${g.slug}`} className="game-card">
            <div className="game-card-art"><MiniBoard /></div>
            <div className="game-card-body">
              <h2>{g.title}</h2>
              <p className="game-card-sub">{g.subtitle}</p>
              <p>{g.tagline}</p>
              <ul className="chips">
                <li>👥 {g.players}</li>
                <li>⏱ {g.time}</li>
                <li>🎂 {g.age}</li>
              </ul>
              <ul className="tags">{g.tags.map((t) => <li key={t}>{t}</li>)}</ul>
              <span className="game-card-cta">เล่นเลย →</span>
            </div>
          </Link>
        ))}

        <div className="game-card soon">
          <div className="soon-art" aria-hidden="true">＋</div>
          <div className="game-card-body">
            <h2>เกมถัดไป</h2>
            <p>กำลังเตรียมเกมใหม่เพิ่มเข้ามา อยากเล่นเกมไหนบอกได้เลย</p>
            <span className="badge">เร็วๆ นี้</span>
          </div>
        </div>
      </div>
    </section>
  );
}
