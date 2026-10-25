import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export interface GameInfo {
  slug: string;
  title: string;
  subtitle: string;
  tagline: string;
  players: string;
  time: string;
  age: string;
  tags: string[];
  modes: string[];
  credit: string;
  /** small preview used on cards */
  preview: 'oqulock';
  Component: LazyExoticComponent<ComponentType>;
}

// Add new games here — the landing and game-select pages pick them up automatically.
export const GAMES: GameInfo[] = [
  {
    slug: '4-oqu-lock',
    title: '4 OQU LOCK',
    subtitle: 'ยอนโอคุล็อก',
    tagline: 'วาง เลื่อน ซ้อน แล้วล็อก ต่อสีตัวเองให้ติดกันครบ 4 ช่องก่อน โดยที่คุณไม่รู้ว่าหมากในแถวตัวเองเป็นสีอะไร',
    players: '2 คน',
    time: '10–15 นาที',
    age: '6+',
    tags: ['วางแผน', 'ข้อมูลซ่อน', 'ต่อสี่'],
    modes: ['เล่นกับ AI', '2 คน เครื่องเดียว'],
    credit: 'ออกแบบโดย Sho Shirasaka · JELLY JELLY GAMES / Kawada',
    preview: 'oqulock',
    Component: lazy(() => import('./oqulock/OquLockGame')),
  },
];

export const findGame = (slug?: string) => GAMES.find((g) => g.slug === slug);
