export { MAX_PLAYERS, PLAYER_COLORS } from '../shared/constants';

export type RoomPhase = 'LOBBY' | 'BRIEFING' | string;

export interface RoomPlayer {
  id: string;
  name: string;
  connected: boolean;
  ready: boolean;
}

export interface RoomView {
  hostId: string;
  phase: RoomPhase;
  players: RoomPlayer[];
}
