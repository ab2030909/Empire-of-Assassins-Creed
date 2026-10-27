import type { GameState } from './engine';

export interface MemberView { id: string; name: string; character: string | null; ready: boolean; connected: boolean; bot: boolean }
export interface RoomView {
  code: string;
  hostId: string;
  youId: string;
  maxRounds: number;
  chat: { from: string | null; text: string; at: number }[];
  privacy: 'public' | 'private';
  map: string;
  members: MemberView[];
  game: GameState | null;
}
