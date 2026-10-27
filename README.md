# Empire of Assassins

Online multiplayer (2–4 players), Monopoly-inspired board game themed on the Assassin's Creed eras. Fan project; not affiliated with Ubisoft.

## Run (development)

```
npm install
npm run dev
```

- Client: http://localhost:5173 (Vite, proxies Socket.IO to the server)
- Server: http://localhost:3001 (`npm run dev:server` / `npm run dev:client` to run separately)

Other players on your LAN can open `http://<your-ip>:5173` after starting Vite with `npx vite --host`.

## Run (production)

```
npm run build
npm start        # serves dist/ and Socket.IO on PORT (default 3001)
```

## Layout

- `shared/data.ts` – board, groups, characters, cards, missions (replaceable content)
- `shared/engine.ts` – pure rules engine (server-authoritative)
- `server/index.ts` – Socket.IO rooms, reconnection, action validation
- `src/` – React UI (menu, lobby, board, modals, victory)

Match state is held in memory; restarting the server ends running matches.
