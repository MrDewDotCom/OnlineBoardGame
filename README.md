# OnlineBoardGame

Board games you can play in the browser, rendered in 3D.

Built with **React + TypeScript + Vite**, **React Router**, and **Three.js** via **React Three Fiber / drei**.

## Run it

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build in dist/
npm run preview  # serve the production build
```

## Pages

| Route | What it is |
| --- | --- |
| `#/` | Landing page with a looping 3D demo board |
| `#/games` | Game selection |
| `#/games/4-oqu-lock` | 4 OQU LOCK (3D board, vs AI or 2 players on one device) |

The app uses `HashRouter` and a relative `base`, so the `dist/` build works on any static host (including GitHub Pages) without server rewrites.

## Project layout

```
src/
  components/      Layout (nav/footer), MiniBoard (2D preview used on cards)
  pages/           Landing, GameSelect, GamePage
  three/           Board3D (reusable 3D board), HeroBoard (landing demo)
  games/
    registry.ts    List of games — add a new game here
    oqulock/
      logic.ts     Pure rules + AI (no React; reusable by a future online server)
      OquLockGame.tsx
```

### Adding a game
1. Create `src/games/<name>/` with a pure `logic.ts` and a React component.
2. Register it in `src/games/registry.ts` — the landing and selection pages pick it up automatically.

## 4 OQU LOCK

A 2-player four-in-a-row variant by Sho Shirasaka (JELLY JELLY GAMES / Kawada).

1. Each player has 8 pieces (6 of their own colour + 2 of the opponent's), shuffled in a row. **You can't see the colours in your own row, only your opponent's.**
2. On your turn, place your next piece on any empty cell of the 4×4 board.
3. From round 2 on, you may then move one single piece one step up/down/left/right.
4. Moving onto another piece stacks them and **locks** both (gold ring) — they can't move again. The top piece's colour counts.
5. First to line up 4 of their colour horizontally or vertically wins.

House rules where the original is unclear: pieces are revealed when placed; completing your own line while placing wins immediately; if both colours complete a line on the same turn, the player who just moved wins; if all pieces are used with no winner, it's a draw.

## Roadmap
- Online multiplayer (rooms + shareable link)
- More games
