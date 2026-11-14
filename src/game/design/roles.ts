import type { Player, RoleId, SystemId } from '../../shared/types';

export interface MissionRole {
  id: RoleId;
  label: string;
  station: string;
  systems: readonly SystemId[];
}

export const MISSION_ROLES: readonly MissionRole[] = [
  { id: 'lead', label: 'Mission Lead', station: 'Command console', systems: [] },
  {
    id: 'power-thermal',
    label: 'Power & Thermal',
    station: 'Power room',
    systems: ['solar', 'thermal'],
  },
  {
    id: 'propulsion-structures',
    label: 'Propulsion & Structures',
    station: 'Engine room',
    systems: ['engine', 'shield'],
  },
  {
    id: 'comms-avionics',
    label: 'Comms & Avionics',
    station: 'Comms deck',
    systems: ['comms', 'navigation'],
  },
];

export function assignMissionRoles(
  players: readonly Player[],
): Record<RoleId, string> {
  if (players.length === 0) {
    throw new Error('At least one connected player is required for role assignment.');
  }
  const orderedPlayers = [...players].sort(
    (left, right) => left.joinOrder - right.joinOrder,
  );
  const assignments = {} as Record<RoleId, string>;
  MISSION_ROLES.forEach((role, index) => {
    const player = orderedPlayers[index % orderedPlayers.length];
    if (!player) throw new Error('Could not assign a mission role.');
    assignments[role.id] = player.id;
  });
  return assignments;
}

export function rolesForPlayer(
  playerId: string,
  assignments: Record<RoleId, string>,
): RoleId[] {
  return MISSION_ROLES.filter((role) => assignments[role.id] === playerId).map(
    (role) => role.id,
  );
}
