import type { MissionId, ResourceKey } from './types';

/** Player-facing game title. Keep in sync with <title> in index.html. */
export const GAME_NAME = 'T -60 seconds';

/**
 * Player colors, indexed by joinOrder. Keep in sync with the comment in tokens.css.
 * These are also the identity colors used by PlayerBadge and turn highlights.
 */
export const PLAYER_COLORS = ['#4fd1ff', '#ffb347', '#c792ff', '#7dff9b'] as const;

export type PlayerColor = (typeof PLAYER_COLORS)[number];

export const RESOURCE_KEYS: readonly ResourceKey[] = [
  'fuel',
  'power',
  'oxygen',
  'water',
  'food',
  'shielding',
  'spares',
] as const;

export const RESOURCE_LABELS: Record<ResourceKey, string> = {
  fuel: 'Fuel',
  power: 'Power',
  oxygen: 'Oxygen',
  water: 'Water',
  food: 'Food',
  shielding: 'Shielding',
  spares: 'Spares',
};

export const MISSION_IDS: readonly MissionId[] = ['iss', 'moon', 'mars'] as const;

export const MISSION_NAMES: Record<MissionId, string> = {
  iss: 'International Space Station',
  moon: 'The Moon',
  mars: 'Mars',
};

export const MISSION_SHORT_NAMES: Record<MissionId, string> = {
  iss: 'ISS',
  moon: 'Moon',
  mars: 'Mars',
};

/** Room codes use no look-alike characters (no 0/O, 1/I/L). */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 4;
export const MAX_PLAYERS = 4;
export const ROOM_CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/;

export function playerColorForJoinOrder(joinOrder: number): string {
  return PLAYER_COLORS[joinOrder] ?? PLAYER_COLORS[0];
}

export function emptyResources(): Record<ResourceKey, number> {
  return {
    fuel: 0,
    power: 0,
    oxygen: 0,
    water: 0,
    food: 0,
    shielding: 0,
    spares: 0,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return 'Something went wrong. Please try again.';
}
