// Authoritative Socket.IO game server. Rooms and match state live in memory.
// Persistence hook: replace `rooms` Map with a repository backed by PostgreSQL later.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { randomUUID, randomInt } from 'node:crypto';
import { Server, Socket } from 'socket.io';
import { createGame, applyAction, viewFor, GameState, Action } from '../shared/engine';
import { CHARACTERS } from '../shared/data';
import type { RoomView } from '../shared/protocol';

import { botMove } from './bot';

interface ChatMsg { from: string | null; text: string; at: number }
const MAPS = ['random', 'classic', 'renaissance', 'colonial', 'ancient'];
function say(room: Room, text: string, from: string | null = null) { room.chat.push({ from, text, at: Date.now() }); if (room.chat.length > 60) room.chat.shift(); }
interface Member { id: string; token: string; name: string; character: string | null; ready: boolean; connected: boolean; socketId: string | null; bot?: boolean }
interface Room { code: string; hostId: string; members: Member[]; maxRounds: number; game: GameState | null; updatedAt: number; chat: ChatMsg[]; privacy: 'public' | 'private'; map: string; botTimer?: NodeJS.Timeout | null }

const BOT_NAMES = ['PC Hawk', 'PC Raven', 'PC Viper', 'PC Owl'];
function addBot(room: Room, want?: unknown): boolean {
  if (room.game || room.members.length >= 4) return false;
  const name = BOT_NAMES.find((n) => !room.members.some((m) => m.name === n)) ?? 'PC';
  const isFree = (id: string) => !room.members.some((m) => m.character === id);
  const free = CHARACTERS.find((c) => c.id === want && isFree(c.id)) ?? CHARACTERS.find((c) => isFree(c.id));
  say(room, `${name} joined the room`);
  room.members.push({ id: randomUUID(), token: randomUUID(), name, character: free?.id ?? null, ready: !!free, connected: true, socketId: null, bot: true });
  return true;
}

/** Schedules the next PC action after a short delay so humans can follow along. */
function scheduleBots(room: Room) {
  if (!room.game || room.botTimer) return;
  const isBot = (id: string) => !!room.members.find((m) => m.id === id)?.bot;
  const mv = botMove(room.game, isBot);
  if (!mv) return;
  room.botTimer = setTimeout(() => {
    room.botTimer = null;
    if (!rooms.has(room.code) || !room.game) return;
    const g = room.game;
    for (const a of [mv.action, ...(mv.extra ?? [])]) {
      const err = applyAction(g, mv.id, a, rng);
      if (err && (a.type === 'buy' || a.type === 'roll')) applyAction(g, mv.id, a.type === 'buy' ? { type: 'decline' } : { type: 'endTurn' }, rng);
      if (err && a.type === 'bid') applyAction(g, mv.id, { type: 'pass' }, rng);
    }
    broadcast(room);
  }, 900);
}

const rooms = new Map<string, Room>();
const rng = () => randomInt(0, 1_000_000) / 1_000_000;
const PORT = Number(process.env.PORT ?? 3001);
const DIST = join(process.cwd(), 'dist');

const MIME: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const http = createServer(async (req, res) => {
  // Serves the production build if present (npm run build && npm start).
  if (!existsSync(DIST)) { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('Empire of Assassins server running. Use the Vite client in development.'); return; }
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let file = normalize(join(DIST, url));
  if (!file.startsWith(DIST) || !existsSync(file) || url === '/') file = join(DIST, 'index.html');
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
const io = new Server(http, { cors: { origin: true } });

const clean = (s: unknown, max = 18) => String(s ?? '').replace(/[^\p{L}\p{N} _'-]/gu, '').trim().slice(0, max);
function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  do { c = Array.from({ length: 5 }, () => A[randomInt(0, A.length)]).join(''); } while (rooms.has(c));
  return c;
}

function broadcast(room: Room) {
  room.updatedAt = Date.now();
  for (const m of room.members) {
    if (!m.socketId) continue;
    const view: RoomView = {
      code: room.code, hostId: room.hostId, youId: m.id, maxRounds: room.maxRounds, chat: room.chat, privacy: room.privacy, map: room.map,
      members: room.members.map(({ id, name, character, ready, connected, bot }) => ({ id, name, character, ready, connected, bot: !!bot })),
      game: room.game ? viewFor(room.game, m.id) : null,
    };
    io.to(m.socketId).emit('room:state', view);
  }
  scheduleBots(room);
}

function attach(socket: Socket, room: Room, m: Member) {
  m.socketId = socket.id;
  m.connected = true;
  socket.data.code = room.code;
  socket.data.memberId = m.id;
  if (room.game) { const p = room.game.players.find((x) => x.id === m.id); if (p) p.connected = true; }
}

function ctx(socket: Socket) {
  const room = rooms.get(socket.data.code);
  const m = room?.members.find((x) => x.id === socket.data.memberId);
  return room && m ? { room, m } : null;
}

type Cb = (r: { ok: boolean; error?: string; code?: string; token?: string }) => void;
const safeCb = (cb: unknown): Cb => (typeof cb === 'function' ? (cb as Cb) : () => {});

function leave(room: Room, m: Member) {
  if (room.game && room.game.phase !== 'gameover') {
    const p = room.game.players.find((x) => x.id === m.id);
    if (p && !p.bankrupt) applyAction(room.game, m.id, { type: 'bankrupt' }, rng);
    if (p) p.connected = false;
    m.connected = false; m.socketId = null;
  } else {
    room.members = room.members.filter((x) => x.id !== m.id);
    say(room, `${m.name} left the room`);
  }
  if (room.members.every((x) => x.bot || !x.connected)) { if (room.botTimer) clearTimeout(room.botTimer); rooms.delete(room.code); return; }
  if (room.hostId === m.id) room.hostId = (room.members.find((x) => x.connected && !x.bot) ?? room.members[0]).id;
  broadcast(room);
}

io.on('connection', (socket) => {
  socket.on('room:addBot', ({ character } = {}) => {
    const c = ctx(socket); if (!c || c.room.hostId !== c.m.id) return;
    if (addBot(c.room, character)) broadcast(c.room);
  });

  socket.on('room:create', ({ name, bots, botChars, character, maxRounds } = {}, cb) => {
    const done = safeCb(cb);
    const n = clean(name);
    if (!n) return done({ ok: false, error: 'Enter a name.' });
    const m: Member = { id: randomUUID(), token: randomUUID(), name: n, character: null, ready: false, connected: true, socketId: null };
    const room: Room = { code: newCode(), hostId: m.id, members: [m], maxRounds: 20, game: null, updatedAt: Date.now(), chat: [], privacy: 'public', map: 'random' };
    say(room, `${n} created the room`);
    rooms.set(room.code, room);
    if (CHARACTERS.some((c) => c.id === character)) m.character = character;
    const mr = Math.floor(Number(maxRounds));
    if (mr >= 5 && mr <= 60) room.maxRounds = mr;
    if (Array.isArray(botChars)) for (const bc of botChars.slice(0, 3)) addBot(room, bc);
    else for (let i = 0; i < Math.min(3, Math.max(0, Math.floor(Number(bots) || 0))); i++) addBot(room);
    attach(socket, room, m);
    done({ ok: true, code: room.code, token: m.token });
    broadcast(room);
  });

  socket.on('room:join', ({ code, name } = {}, cb) => {
    const done = safeCb(cb);
    const room = rooms.get(String(code ?? '').toUpperCase().trim());
    const n = clean(name);
    if (!n) return done({ ok: false, error: 'Enter a name.' });
    if (!room) return done({ ok: false, error: 'Room not found.' });
    if (room.game) return done({ ok: false, error: 'Match already in progress.' });
    if (room.members.length >= 4) return done({ ok: false, error: 'Room is full (4 players).' });
    const m: Member = { id: randomUUID(), token: randomUUID(), name: n, character: null, ready: false, connected: true, socketId: null };
    room.members.push(m);
    say(room, `${n} joined the room`);
    attach(socket, room, m);
    done({ ok: true, code: room.code, token: m.token });
    broadcast(room);
  });

  socket.on('room:resume', ({ code, token } = {}, cb) => {
    const done = safeCb(cb);
    const room = rooms.get(String(code ?? ''));
    const m = room?.members.find((x) => x.token === token);
    if (!room || !m) return done({ ok: false, error: 'Session expired.' });
    if (room.game?.players.find((p) => p.id === m.id)?.bankrupt && room.game.phase !== 'gameover') {
      // spectators may still watch
    }
    attach(socket, room, m);
    done({ ok: true, code: room.code, token: m.token });
    broadcast(room);
  });

  socket.on('room:character', ({ character } = {}) => {
    const c = ctx(socket); if (!c || c.room.game) return;
    if (!CHARACTERS.some((x) => x.id === character)) return;
    if (c.room.members.some((x) => x.id !== c.m.id && x.character === character)) return;
    c.m.character = character; c.m.ready = false;
    broadcast(c.room);
  });

  socket.on('room:ready', ({ ready } = {}) => {
    const c = ctx(socket); if (!c || c.room.game || !c.m.character) return;
    c.m.ready = !!ready;
    broadcast(c.room);
  });

  socket.on('room:settings', ({ maxRounds } = {}) => {
    const c = ctx(socket); if (!c || c.room.game || c.room.hostId !== c.m.id) return;
    const r = Math.floor(Number(maxRounds));
    if (r >= 5 && r <= 60) { c.room.maxRounds = r; broadcast(c.room); }
  });

  socket.on('room:chat', ({ text } = {}) => {
    const c = ctx(socket); if (!c) return;
    const s = String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, 200); if (!s) return;
    say(c.room, s, c.m.name); broadcast(c.room);
  });

  socket.on('room:prefs', ({ privacy, map } = {}) => {
    const c = ctx(socket); if (!c || c.room.game || c.room.hostId !== c.m.id) return;
    if (privacy === 'public' || privacy === 'private') c.room.privacy = privacy;
    if (MAPS.includes(map)) c.room.map = map;
    broadcast(c.room);
  });

  socket.on('room:start', (_: unknown, cb) => {
    const done = safeCb(cb);
    const c = ctx(socket); if (!c) return done({ ok: false, error: 'Not in a room.' });
    const { room, m } = c;
    if (room.hostId !== m.id) return done({ ok: false, error: 'Only the host can start.' });
    if (room.game && room.game.phase !== 'gameover') return done({ ok: false, error: 'Already started.' });
    const players = room.members.filter((x) => x.connected);
    if (players.length < 2) return done({ ok: false, error: 'At least 2 players are required.' });
    if (!players.every((x) => x.ready && x.character)) return done({ ok: false, error: 'All players must pick a character and be ready.' });
    room.members = players;
    room.game = createGame(players.map((x) => ({ id: x.id, name: x.name, character: x.character! })), room.maxRounds, rng);
    done({ ok: true });
    broadcast(room);
  });

  socket.on('room:playAgain', () => {
    const c = ctx(socket); if (!c || c.room.hostId !== c.m.id || c.room.game?.phase !== 'gameover') return;
    c.room.game = null;
    c.room.members = c.room.members.filter((x) => x.connected);
    for (const x of c.room.members) x.ready = !!x.bot;
    broadcast(c.room);
  });

  socket.on('room:kick', ({ id } = {}) => {
    const c = ctx(socket); if (!c || c.room.hostId !== c.m.id) return;
    const t = c.room.members.find((x) => x.id === id);
    if (!t || t.id === c.m.id) return;
    if (t.bot && !c.room.game) { c.room.members = c.room.members.filter((x) => x.id !== t.id); broadcast(c.room); return; }
    if (t.connected && !t.bot) return;
    leave(c.room, t);
  });

  socket.on('room:leave', () => {
    const c = ctx(socket); if (!c) return;
    socket.data.code = null;
    leave(c.room, c.m);
  });

  socket.on('game:action', (action: Action, cb) => {
    const done = safeCb(cb);
    const c = ctx(socket);
    if (!c || !c.room.game) return done({ ok: false, error: 'No match in progress.' });
    if (!action || typeof action !== 'object' || typeof action.type !== 'string') return done({ ok: false, error: 'Bad action.' });
    const err = applyAction(c.room.game, c.m.id, action, rng);
    done(err ? { ok: false, error: err } : { ok: true });
    if (!err) broadcast(c.room);
  });

  socket.on('disconnect', () => {
    const c = ctx(socket); if (!c || c.m.socketId !== socket.id) return;
    c.m.connected = false; c.m.socketId = null;
    if (c.room.game) { const p = c.room.game.players.find((x) => x.id === c.m.id); if (p) p.connected = false; }
    else {
      // in lobby: drop after grace period if not back
      setTimeout(() => { const r = rooms.get(c.room.code); if (r && !r.game && !c.m.connected) leave(r, c.m); }, 30_000);
    }
    if (c.room.hostId === c.m.id) { const h = c.room.members.find((x) => x.connected); if (h) c.room.hostId = h.id; }
    broadcast(c.room);
  });
});

// Garbage-collect idle rooms after 6 hours.
setInterval(() => { const now = Date.now(); for (const [k, r] of rooms) if (now - r.updatedAt > 6 * 3600_000) rooms.delete(k); }, 600_000);

http.listen(PORT, () => console.log(`Empire of Assassins server on http://localhost:${PORT}`));
