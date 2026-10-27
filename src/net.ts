import { io } from 'socket.io-client';
import type { Action } from '../shared/engine';

// VITE_SERVER_URL points the deployed frontend (Amplify) at the game server (CloudFront -> EC2).
// Locally it's unset and Vite proxies /socket.io to localhost:3001.
const SERVER = (import.meta.env.VITE_SERVER_URL as string | undefined) || undefined;
export const socket = SERVER ? io(SERVER, { autoConnect: true, reconnection: true }) : io({ autoConnect: true, reconnection: true });

export interface Ack { ok: boolean; error?: string; code?: string; token?: string }

export function emit(event: string, payload: unknown = {}): Promise<Ack> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve({ ok: false, error: 'Server did not respond.' }), 6000);
    socket.emit(event, payload, (r: Ack) => { clearTimeout(t); resolve(r); });
  });
}
export const act = (a: Action) => emit('game:action', a);

const KEY = 'eoa-session';
export const session = {
  get(): { code: string; token: string } | null {
    try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; }
  },
  set(code: string, token: string) { localStorage.setItem(KEY, JSON.stringify({ code, token })); },
  clear() { localStorage.removeItem(KEY); },
};
