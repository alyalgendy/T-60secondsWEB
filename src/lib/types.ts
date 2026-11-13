export const MAX_PLAYERS = 4;
export const MAX_LOG_ENTRIES = 24;

export const PLAYER_COLORS = [
  "#5eead4", // mint
  "#fbbf24", // amber
  "#f472b6", // pink
  "#a3e635", // lime
] as const;

export type RoomPhase = "LOBBY" | "BRIEFING";

/** Exactly what lives in Firebase at rooms/{code}/players/{playerId}. */
export interface PlayerRecord {
  name: string;
  color: string;
  ready: boolean;
  connected: boolean;
  joinedAt: number;
}

export interface LogRecord {
  at: number;
  text: string;
}

/** Exactly what lives in Firebase at rooms/{code}. */
export interface RoomRecord {
  createdAt: number;
  hostId: string;
  phase: RoomPhase;
  players?: Record<string, PlayerRecord>;
  log?: Record<string, LogRecord>;
}

export interface PlayerView extends PlayerRecord {
  id: string;
}

export interface LogEntryView extends LogRecord {
  id: string;
}

/** Client-facing, normalised shape. Never render raw Firebase objects directly. */
export interface RoomView {
  code: string;
  createdAt: number;
  hostId: string | null;
  phase: RoomPhase;
  players: PlayerView[];
  log: LogEntryView[];
}

export type LobbyErrorCode =
  | "room-not-found"
  | "room-exists"
  | "room-full"
  | "invalid-code"
  | "not-ready"
  | "not-host"
  | "offline"
  | "unknown";

export class LobbyError extends Error {
  readonly code: LobbyErrorCode;

  constructor(code: LobbyErrorCode, message: string) {
    super(message);
    this.name = "LobbyError";
    this.code = code;
  }
}

export function toLobbyError(error: unknown): LobbyError {
  if (error instanceof LobbyError) return error;
  if (error instanceof Error) return new LobbyError("unknown", error.message);
  return new LobbyError("unknown", "Something went wrong.");
}

export function isRoomPhase(value: unknown): value is RoomPhase {
  return value === "LOBBY" || value === "BRIEFING";
}
