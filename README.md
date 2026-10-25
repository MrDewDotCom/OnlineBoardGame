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

Components (per the box): 16 yellow cubes and a grey 4×4 checkerboard mat. Each cube has its colour — **white** or **black** — on one face only.

1. Each player takes 6 cubes of their colour + 2 of the opponent's, shuffles them, and lines them up with the coloured face toward the opponent. **You can't see the colours in your own row, only your opponent's.**
2. On your turn, take the rightmost cube and place it (colour face up) on any empty cell.
3. From round 2 on, you may then move one single cube one step up/down/left/right.
4. Moving onto another cube stacks them and **LOCKs** both — they can't move again. The top cube's colour counts.
5. First to connect 4 cells of their colour edge-to-edge wins. There are 7 winning shapes (the tetrominoes I, O, T, S, Z, L, J) in any rotation — diagonals don't count.

House rules where the box is unclear: completing your own shape while placing wins immediately; if both colours complete a shape on the same turn, the player who just moved wins; if all cubes are used with no winner, it's a draw.

## Roadmap
- Online multiplayer (rooms + shareable link)
- More games
