import { useEffect, useState, type FormEvent } from 'react';
import clsx from 'clsx';
import {
  HudButton,
  HudPanel,
  HudShell,
  PlayerBadge,
  StatusPill,
} from '../../shared/ui';
import { getErrorMessage, MAX_PLAYERS } from '../../shared/constants';
import type { Player } from '../../shared/types';
import styles from './Lobby.module.css';

export interface LobbySceneProps {
  roomCode: string | null;
  me: Player | null;
  players: Player[];
  status: 'idle' | 'loading' | 'error';
  error: string | null;
  onCreate: (name: string) => Promise<void>;
  onJoin: (code: string, name: string) => Promise<void>;
  onStart: () => Promise<void>;
  onLeave: () => Promise<void>;
}

const NAME_KEY = 't60.name';

const MISSION_PATH = [
  {
    id: 'iss',
    number: '01',
    name: 'International Space Station',
    note: 'Learn how people live and work in orbit.',
  },
  {
    id: 'moon',
    number: '02',
    name: 'The Moon',
    note: 'Choose a lander and balance fuel, mass and risk.',
  },
  {
    id: 'mars',
    number: '03',
    name: 'Mars',
    note: 'Survive the longest trip with the tightest budget.',
  },
] as const;

export default function LobbyScene({
  roomCode,
  me,
  players,
  status,
  error,
  onCreate,
  onJoin,
  onStart,
  onLeave,
}: LobbySceneProps) {
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [code, setCode] = useState(roomCode ?? '');
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (roomCode) setCode(roomCode);
  }, [roomCode]);

  const rememberName = (value: string) => {
    try {
      localStorage.setItem(NAME_KEY, value.trim());
    } catch {
      // Private browsing can block storage; the game still works.
    }
  };

  const requireName = (): string | null => {
    const clean = name.trim();
    if (!clean) {
      setLocalError('Enter your name first.');
      return null;
    }
    if (clean.length < 2) {
      setLocalError('Use at least 2 characters for your name.');
      return null;
    }
    return clean;
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const clean = requireName();
    if (!clean) return;
    setBusy(true);
    setLocalError(null);
    try {
      await onCreate(clean);
      rememberName(clean);
    } catch (createError: unknown) {
      setLocalError(getErrorMessage(createError));
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    const clean = requireName();
    if (!clean) return;
    if (!code.trim()) {
      setLocalError('Enter the 4-character room code.');
      return;
    }
    setBusy(true);
    setLocalError(null);
    try {
      await onJoin(code, clean);
      rememberName(clean);
    } catch (joinError: unknown) {
      setLocalError(getErrorMessage(joinError));
    } finally {
      setBusy(false);
    }
  };

  const handleStart = async () => {
    setStarting(true);
    setLocalError(null);
    try {
      await onStart();
    } catch (startError: unknown) {
      setLocalError(getErrorMessage(startError));
    } finally {
      setStarting(false);
    }
  };

  const handleLeave = async () => {
    setBusy(true);
    try {
      await onLeave();
    } finally {
      setBusy(false);
    }
  };

  const message = localError ?? error;
  const isInRoom = Boolean(me && roomCode);
  const full = players.length >= MAX_PLAYERS;

  if (isInRoom && me && roomCode) {
    return (
      <HudShell
        missionName="Mission Control"
        stepLabel="Lobby"
        roomCode={roomCode}
        players={players}
        me={me}
      >
        <div className={styles.room}>
          <HudPanel
            title="Your crew"
            subtitle={`${players.length} of ${MAX_PLAYERS} seats filled`}
            actions={
              <StatusPill tone={full ? 'warn' : 'ok'}>
                {full ? 'Room full' : 'Open seats'}
              </StatusPill>
            }
            className={styles.crewPanel}
          >
            <div className={styles.codeBlock}>
              <span className={styles.codeLabel}>Room code</span>
              <span className={styles.bigCode}>{roomCode}</span>
              <span className={styles.codeHint}>
                Share this code with your crew. They join from the same link.
              </span>
            </div>

            <ul className={styles.playerList}>
              {players.map((player) => (
                <li key={player.id} className={styles.playerRow}>
                  <PlayerBadge player={player} showName />
                  <span className={styles.playerMeta}>
                    {player.id === me.id ? <StatusPill tone="info">You</StatusPill> : null}
                    {player.isHost ? <StatusPill tone="ok">Host</StatusPill> : null}
                    {!player.connected ? (
                      <StatusPill tone="warn">Reconnecting</StatusPill>
                    ) : null}
                  </span>
                </li>
              ))}
              {Array.from({ length: MAX_PLAYERS - players.length }).map((_, index) => (
                <li key={`empty-${index}`} className={clsx(styles.playerRow, styles.emptyRow)}>
                  <span className={styles.emptySeat} aria-hidden="true">
                    +
                  </span>
                  <span className={styles.emptyText}>Open seat</span>
                </li>
              ))}
            </ul>

            <div className={styles.leaveRow}>
              <HudButton variant="danger" onClick={handleLeave} disabled={busy}>
                Leave room
              </HudButton>
            </div>
          </HudPanel>

          <HudPanel
            title="Mission path"
            subtitle="Three missions, one cure."
            className={styles.pathPanel}
          >
            <ol className={styles.pathList}>
              {MISSION_PATH.map((mission) => (
                <li key={mission.id} className={styles.pathItem}>
                  <span className={styles.pathNumber}>{mission.number}</span>
                  <div>
                    <span className={styles.pathName}>{mission.name}</span>
                    <span className={styles.pathNote}>{mission.note}</span>
                  </div>
                </li>
              ))}
            </ol>

            <div className={styles.startBox}>
              {me.isHost ? (
                <>
                  <HudButton
                    variant="primary"
                    block
                    onClick={handleStart}
                    disabled={starting || players.length === 0}
                  >
                    {starting ? 'Starting…' : 'Start mission'}
                  </HudButton>
                  <p className={styles.hint}>
                    You can start with one player. Everyone will plan together.
                  </p>
                </>
              ) : (
                <>
                  <StatusPill tone="info">Waiting for host</StatusPill>
                  <p className={styles.hint}>
                    {players.find((player) => player.isHost)?.name ?? 'The host'} will
                    start the mission when the crew is ready.
                  </p>
                </>
              )}
            </div>

            {message ? (
              <p className={styles.error} role="alert">
                {message}
              </p>
            ) : null}
          </HudPanel>
        </div>
      </HudShell>
    );
  }

  const joinOnly = Boolean(roomCode);

  return (
    <HudShell missionName="Mission Control" stepLabel="Lobby">
      <div className={styles.landing}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>NASA Space Apps Challenge</p>
          <h1 className={styles.title}>
            Space
            <br />
            Mission
            <br />
            <span>Design Game</span>
          </h1>
          <p className={styles.subtitle}>
            A disease threatens Earth. The cure is in space. Plan three missions
            with your crew — the ISS, the Moon, then Mars.
          </p>

          <ol className={styles.heroPath}>
            {MISSION_PATH.map((mission) => (
              <li key={mission.id}>
                <span className={styles.heroNumber}>{mission.number}</span>
                <span>{mission.name}</span>
              </li>
            ))}
          </ol>

          <p className={styles.footnote}>
            1–4 players · one screen each · about 30 minutes
          </p>
        </section>

        <HudPanel
          title={joinOnly ? 'Join this room' : 'Enter mission control'}
          subtitle={
            joinOnly
              ? 'You were invited to a crew. Add your name to join.'
              : 'Create a room, or join your crew with a code.'
          }
          className={styles.formPanel}
        >
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              if (joinOnly) void handleJoin();
              else void handleCreate(event);
            }}
          >
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Your name</span>
              <input
                className={styles.input}
                value={name}
                onChange={(event) => {
                  setName(event.currentTarget.value);
                  setLocalError(null);
                }}
                maxLength={16}
                autoComplete="nickname"
                placeholder="e.g. Mae"
                aria-describedby="name-help"
              />
            </label>
            <p className={styles.fieldHelp} id="name-help">
              Shown to the crew. You can change it by joining again.
            </p>

            {joinOnly ? (
              <>
                <div className={styles.joinCode}>
                  <span className={styles.fieldLabel}>Room code</span>
                  <strong>{roomCode}</strong>
                </div>
                <HudButton
                  variant="primary"
                  type="submit"
                  block
                  disabled={busy || status === 'loading'}
                >
                  {busy || status === 'loading' ? 'Joining…' : 'Join room'}
                </HudButton>
              </>
            ) : (
              <>
                <HudButton
                  variant="primary"
                  type="submit"
                  block
                  disabled={busy || status === 'loading'}
                >
                  {busy ? 'Creating…' : 'Create a room'}
                </HudButton>

                <div className={styles.divider}>
                  <span>or join with a code</span>
                </div>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Room code</span>
                  <input
                    className={clsx(styles.input, styles.codeInput)}
                    value={code}
                    onChange={(event) => {
                      setCode(event.currentTarget.value.toUpperCase());
                      setLocalError(null);
                    }}
                    maxLength={4}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="ABCD"
                  />
                </label>

                <HudButton
                  variant="ghost"
                  block
                  onClick={handleJoin}
                  disabled={busy || status === 'loading'}
                >
                  {busy ? 'Joining…' : 'Join room'}
                </HudButton>
              </>
            )}

            {message ? (
              <p className={styles.error} role="alert">
                {message}
              </p>
            ) : null}

            <p className={styles.hint}>
              No account needed. The host shares a 4-character room code.
            </p>
          </form>
        </HudPanel>
      </div>
    </HudShell>
  );
}
