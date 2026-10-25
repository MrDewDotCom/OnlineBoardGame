import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import MiniBoard from '../components/MiniBoard';
import { GAMES } from '../games/registry';

const HeroBoard = lazy(() => import('../three/HeroBoard'));

const FEATURES = [
  { icon: '🧊', title: 'กระดาน 3 มิติ', text: 'หมุน ซูม และดูหมากซ้อนกันได้รอบทิศ เหมือนนั่งอยู่หน้ากระดานจริง เปิดเบราว์เซอร์แล้วเล่นได้เลย' },
  { icon: '🤖', title: 'มีคู่ซ้อมเป็น AI', text: 'อยากฝึกคนเดียวก็เล่นกับ AI ได้ เลือกระดับความยากได้ตามใจ' },
  { icon: '🫱🏻‍🫲🏽', title: 'เล่นกับเพื่อนข้างๆ', text: 'โหมด 2 คนเครื่องเดียว มีหน้าจอบังตอนส่งเครื่อง เกมที่มีข้อมูลซ่อนก็ยังเล่นได้แฟร์' },
];

export default function Landing() {
  const featured = GAMES[0];
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">บอร์ดเกมบนเว็บ · เล่นฟรี</p>
          <h1>
            โต๊ะบอร์ดเกม<br />
            <span className="hl">ที่อยู่ในเบราว์เซอร์</span>
          </h1>
          <p className="lead">
            รวมบอร์ดเกมสั้นๆ ที่คิดสนุก เล่นจบในไม่กี่นาที เลือกเกม เลือกคู่แข่ง แล้วเริ่มวางหมากได้ทันที
          </p>
          <div className="cta-row">
            <Link to="/games" className="btn btn-dark btn-lg">เลือกเกมที่จะเล่น →</Link>
            <Link to={`/games/${featured.slug}`} className="btn btn-lg">เล่น {featured.title} เลย</Link>
          </div>
          <dl className="hero-stats">
            <div><dt>{GAMES.length}</dt><dd>เกมพร้อมเล่น</dd></div>
            <div><dt>2</dt><dd>โหมดการเล่น</dd></div>
            <div><dt>0 ฿</dt><dd>ค่าใช้จ่าย</dd></div>
          </dl>
        </div>
        <div className="hero-art">
          <Suspense fallback={<MiniBoard className="hero-fallback" />}>
            <HeroBoard />
          </Suspense>
        </div>
      </section>

      <section className="features">
        {FEATURES.map((f) => (
          <article key={f.title} className="feature">
            <div className="feature-icon" aria-hidden="true">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </article>
        ))}
      </section>

      <section className="featured">
        <div className="featured-art"><MiniBoard /></div>
        <div className="featured-copy">
          <p className="eyebrow">เกมแนะนำ</p>
          <h2>{featured.title} <small>{featured.subtitle}</small></h2>
          <p>{featured.tagline}</p>
          <ul className="chips">
            <li>👥 {featured.players}</li>
            <li>⏱ {featured.time}</li>
            <li>🎂 {featured.age}</li>
          </ul>
          <Link to={`/games/${featured.slug}`} className="btn btn-dark">เริ่มเล่น</Link>
        </div>
      </section>

      <section className="soon-band">
        <div>
          <h2>กำลังมา: เล่นออนไลน์กับเพื่อนคนละเครื่อง</h2>
          <p>สร้างห้อง ส่งลิงก์ให้เพื่อน แล้วเล่นแบบเรียลไทม์ พร้อมเกมใหม่ที่จะทยอยเพิ่มเข้ามา</p>
        </div>
        <Link to="/games" className="btn btn-lg">ดูเกมทั้งหมด</Link>
      </section>
    </>
  );
}
