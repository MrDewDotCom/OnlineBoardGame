import { Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { findGame } from '../games/registry';

export default function GamePage() {
  const { slug } = useParams();
  const game = findGame(slug);

  if (!game)
    return (
      <section className="page">
        <h1>ไม่พบเกมนี้</h1>
        <Link to="/games" className="btn">← กลับไปเลือกเกม</Link>
      </section>
    );

  const { Component } = game;
  return (
    <section className="page">
      <div className="game-head">
        <Link to="/games" className="back">← เลือกเกมอื่น</Link>
        <h1>{game.title} <small>{game.subtitle}</small></h1>
        <p className="credit">{game.credit}</p>
      </div>
      <Suspense fallback={<p className="lead">กำลังโหลดเกม…</p>}>
        <Component />
      </Suspense>
    </section>
  );
}
