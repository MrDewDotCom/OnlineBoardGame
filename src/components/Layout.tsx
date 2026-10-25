import { Link, NavLink, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="shell">
      <header className="nav">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span>Online<b>Board</b>Game</span>
        </Link>
        <nav>
          <NavLink to="/" end>หน้าแรก</NavLink>
          <NavLink to="/games">เลือกเกม</NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="footer">
        <span>OnlineBoardGame · โปรเจกต์บอร์ดเกมเล่นบนเว็บ</span>
        <span>ลิขสิทธิ์เกมเป็นของผู้ออกแบบและผู้จัดจำหน่ายแต่ละเกม</span>
      </footer>
    </div>
  );
}
