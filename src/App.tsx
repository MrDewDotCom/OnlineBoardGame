import { useEffect } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import GameSelect from './pages/GameSelect';
import GamePage from './pages/GamePage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// HashRouter keeps deep links working on static hosts such as GitHub Pages.
export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="games" element={<GameSelect />} />
          <Route path="games/:slug" element={<GamePage />} />
          <Route path="*" element={<Landing />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
