import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { MarkerSlot } from '../../components/MarkerBadge';
import type { Marker } from '../../lib/markers';
import { CABIN_STATIONS } from '../../shared/sim';
import type {
  MissionPosition,
  MissionState,
  Player,
  RoleId,
  SystemId,
} from '../../shared/types';
import type { MissionStationId } from './types';
import styles from './CabinMap.module.css';

const SYSTEMS: readonly SystemId[] = [
  'engine',
  'solar',
  'thermal',
  'comms',
  'navigation',
  'shield',
];

const STATION_NAMES: Record<MissionStationId, string> = {
  engine: 'Engine',
  solar: 'Solar',
  thermal: 'Thermal',
  comms: 'Comms',
  navigation: 'Navigation',
  shield: 'Shield',
  storage: 'Storage',
  airlock: 'Airlock',
};

const STATION_GLYPHS: Record<MissionStationId, string> = {
  engine: '▲',
  solar: '☼',
  thermal: '◇',
  comms: '⌁',
  navigation: '✣',
  shield: '⬡',
  storage: '▦',
  airlock: '◉',
};

const ROLE_GLYPHS: Record<RoleId, string> = {
  lead: '⌘',
  'power-thermal': '☼',
  'propulsion-structures': '▲',
  'comms-avionics': '⌁',
};

const WALK_SPEED = 28;
const STATION_RANGE = 14;
const MOVE_KEYS: Record<string, MissionPosition> = {
  w: { x: 0, y: -1 },
  ArrowUp: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  ArrowLeft: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest('button, input, select, textarea, a'))
  );
}

function nearestStation(position: MissionPosition): MissionStationId | null {
  let nearest: MissionStationId | null = null;
  let nearestDistance = STATION_RANGE;
  for (const [station, location] of Object.entries(CABIN_STATIONS) as [
    MissionStationId,
    MissionPosition,
  ][]) {
    const distance = Math.hypot(position.x - location.x, position.y - location.y);
    if (distance <= nearestDistance) {
      nearest = station;
      nearestDistance = distance;
    }
  }
  return nearest;
}

interface CabinMapProps {
  me: Player;
  players: readonly Player[];
  mission: MissionState;
  now: number;
  positions: Readonly<Record<string, MissionPosition>>;
  roleAssignments: Partial<Record<RoleId, string>>;
  onPosition: (position: MissionPosition) => void;
  onSelectStation: (station: MissionStationId) => void;
  onInteract: (station: MissionStationId) => void;
  onRelease: () => void;
  markers: Marker[];
}

export default function CabinMap({
  me,
  players,
  mission,
  now,
  positions,
  roleAssignments,
  onPosition,
  onSelectStation,
  onInteract,
  onRelease,
  markers,
}: CabinMapProps) {
  const start = mission.players[me.id] ?? { x: 44, y: 84, carrying: null };
  const [localPosition, setLocalPosition] = useState<MissionPosition>({
    x: start.x,
    y: start.y,
  });
  const [selectedStation, setSelectedStation] =
    useState<MissionStationId>('navigation');
  const positionRef = useRef(localPosition);
  const targetRef = useRef<MissionPosition | null>(null);
  const mapElement = useRef<HTMLDivElement>(null);
  const keys = useRef(new Set<string>());
  const lastFrameAt = useRef(0);
  const lastRenderAt = useRef(0);
  const lastSendAt = useRef(0);
  const heldRef = useRef(false);
  const callbacks = useRef({ onPosition, onInteract, onRelease, onSelectStation });

  useEffect(() => {
    callbacks.current = { onPosition, onInteract, onRelease, onSelectStation };
  }, [onInteract, onPosition, onRelease, onSelectStation]);

  useEffect(() => {
    const initial = mission.players[me.id] ?? { x: 44, y: 84, carrying: null };
    const next = { x: initial.x, y: initial.y };
    positionRef.current = next;
    setLocalPosition(next);
    targetRef.current = null;
    callbacks.current.onPosition(next);
  }, [me.id, mission.attempt]);

  useEffect(() => {
    let frame = 0;
    const animate = (timestamp: number) => {
      if (!lastFrameAt.current) lastFrameAt.current = timestamp;
      const elapsed = Math.min(0.06, (timestamp - lastFrameAt.current) / 1000);
      lastFrameAt.current = timestamp;

      const current = positionRef.current;
      const direction = { x: 0, y: 0 };
      for (const key of keys.current) {
        const vector = MOVE_KEYS[key];
        if (vector) {
          direction.x += vector.x;
          direction.y += vector.y;
        }
      }
      const target = targetRef.current;
      if (direction.x === 0 && direction.y === 0 && target) {
        const dx = target.x - current.x;
        const dy = target.y - current.y;
        const remaining = Math.hypot(dx, dy);
        if (remaining < 0.8) {
          targetRef.current = null;
        } else {
          direction.x = dx / remaining;
          direction.y = dy / remaining;
        }
      }
      const magnitude = Math.hypot(direction.x, direction.y);
      if (magnitude > 0) {
        const next = {
          x: Math.min(96, Math.max(4, current.x + (direction.x / magnitude) * WALK_SPEED * elapsed)),
          y: Math.min(94, Math.max(6, current.y + (direction.y / magnitude) * WALK_SPEED * elapsed)),
        };
        positionRef.current = next;
        if (timestamp - lastRenderAt.current >= 33) {
          lastRenderAt.current = timestamp;
          setLocalPosition(next);
        }
        if (timestamp - lastSendAt.current >= 100) {
          lastSendAt.current = timestamp;
          callbacks.current.onPosition(next);
        }
      }
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => {
      window.cancelAnimationFrame(frame);
      lastFrameAt.current = 0;
      keys.current.clear();
      if (heldRef.current) callbacks.current.onRelease();
      heldRef.current = false;
    };
  }, []);

  const selectStation = useCallback((station: MissionStationId) => {
    const location = CABIN_STATIONS[station];
    setSelectedStation(station);
    targetRef.current = location;
    callbacks.current.onSelectStation(station);
    mapElement.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const movementKey = event.key in MOVE_KEYS;
      if (movementKey && !isInteractiveTarget(event.target)) {
        event.preventDefault();
        keys.current.add(event.key);
      }
      if (
        (event.key.toLowerCase() === 'e' || event.code === 'Space') &&
        !event.repeat &&
        !isInteractiveTarget(event.target)
      ) {
        const station = nearestStation(positionRef.current);
        if (station) {
          event.preventDefault();
          selectStation(station);
          callbacks.current.onInteract(station);
          heldRef.current = true;
        }
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keys.current.delete(event.key);
      if (event.key.toLowerCase() === 'e' || event.code === 'Space') {
        if (heldRef.current) callbacks.current.onRelease();
        heldRef.current = false;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [selectStation]);

  const localCrew = players.find((player) => player.id === me.id);
  const selectedLocation = CABIN_STATIONS[selectedStation];
  const canInteract =
    Math.hypot(
      localPosition.x - selectedLocation.x,
      localPosition.y - selectedLocation.y,
    ) <= STATION_RANGE;
  const stationIds: MissionStationId[] = [
    ...SYSTEMS,
    'storage',
    'airlock',
  ];

  return (
    <div className={styles.cabin} aria-label="Walkable capsule cabin">
      <div
        className={styles.map}
        ref={mapElement}
        tabIndex={0}
        aria-label="Cabin map. Use WASD or arrow keys to walk between stations."
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.focus();
        }}
      >
        <div className={styles.floorGrid} aria-hidden="true" />
        <div className={styles.cabinCore} aria-hidden="true" />
        {stationIds.map((station) => {
          const system = SYSTEMS.includes(station as SystemId)
            ? mission.systems[station as SystemId]
            : null;
          const eventActive =
            system !== null &&
            mission.events.some(
              (event) =>
                event.system === station &&
                event.startsAt <= now &&
                event.status !== 'resolved' &&
                event.status !== 'failed',
            );
          const location = CABIN_STATIONS[station];
          return (
            <button
              key={station}
              type="button"
              className={styles.station}
              data-selected={selectedStation === station}
              data-system-status={system?.status ?? 'ok'}
              data-event-active={eventActive}
              style={{ left: `${location.x}%`, top: `${location.y}%` }}
              aria-label={`${STATION_NAMES[station]} station${system ? `, ${system.status}` : ''}${eventActive ? ', event active' : ''}`}
              onClick={() => selectStation(station)}
            >
              <span className={styles.stationGlyph} aria-hidden="true">
                {STATION_GLYPHS[station]}
              </span>
              <span className={styles.stationName}>{STATION_NAMES[station]}</span>
              {system && (
                <span className={styles.stationHealth} aria-hidden="true">
                  {Math.ceil(system.health)}%
                </span>
              )}
            </button>
          );
        })}
        {players.map((player) => {
          const missionPlayer = mission.players[player.id];
          const position =
            player.id === me.id
              ? localPosition
              : positions[player.id] ??
                (missionPlayer
                  ? { x: missionPlayer.x, y: missionPlayer.y }
                  : { x: 44, y: 84 });
          const assignedRole = (Object.entries(roleAssignments).find(
            ([, playerId]) => playerId === player.id,
          )?.[0] ?? 'lead') as RoleId;
          return (
            <div
              key={player.id}
              className={styles.avatar}
              role="img"
              data-self={player.id === me.id}
              style={
                {
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                  '--avatar-color': player.color,
                } as CSSProperties
              }
              aria-label={`${player.name}, ${assignedRole.replaceAll('-', ' ')}`}
            >
              <span aria-hidden="true">{ROLE_GLYPHS[assignedRole]}</span>
              {missionPlayer?.carrying && (
                <span className={styles.carrying} aria-label="Carrying spare">
                  +
                </span>
              )}
            </div>
          );
        })}
        <MarkerSlot markers={markers} anchor="mission-map" />
      </div>
      <div className={styles.cabinFooter}>
        <div className={styles.selectedStation}>
          <span className={styles.selectedGlyph} aria-hidden="true">
            {STATION_GLYPHS[selectedStation]}
          </span>
          <span>
            <strong>{STATION_NAMES[selectedStation]}</strong>
            <small>
              {localCrew?.name ?? me.name} · {mission.players[me.id]?.carrying ? 'Spare carried' : 'Hands free'}
            </small>
          </span>
        </div>
        <button
          className={styles.holdButton}
          type="button"
          disabled={!canInteract}
          onPointerDown={(event) => {
            event.preventDefault();
            selectStation(selectedStation);
            callbacks.current.onInteract(selectedStation);
            heldRef.current = true;
          }}
          onPointerUp={() => {
            if (heldRef.current) callbacks.current.onRelease();
            heldRef.current = false;
          }}
          onPointerCancel={() => {
            if (heldRef.current) callbacks.current.onRelease();
            heldRef.current = false;
          }}
          onPointerLeave={() => {
            if (heldRef.current) callbacks.current.onRelease();
            heldRef.current = false;
          }}
          onBlur={() => {
            if (heldRef.current) callbacks.current.onRelease();
            heldRef.current = false;
          }}
          onKeyDown={(event) => {
            if (
              canInteract &&
              (event.key.toLowerCase() === 'e' || event.code === 'Space') &&
              !event.repeat
            ) {
              event.preventDefault();
              selectStation(selectedStation);
              callbacks.current.onInteract(selectedStation);
              heldRef.current = true;
            }
          }}
          onKeyUp={(event) => {
            if (event.key.toLowerCase() === 'e' || event.code === 'Space') {
              if (heldRef.current) callbacks.current.onRelease();
              heldRef.current = false;
            }
          }}
        >
          Hold E · Interact
        </button>
        <p className={styles.controls}>
          WASD / arrows to walk · E / Space to interact
        </p>
      </div>
    </div>
  );
}
