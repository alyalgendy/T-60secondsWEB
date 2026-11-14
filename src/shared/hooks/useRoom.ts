import { useEffect, useRef, useState } from 'react';
import { get, onDisconnect, ref, update } from 'firebase/database';
import { db } from '../firebase';
import { getErrorMessage } from '../constants';
import { claimHost, subscribeMeta, subscribePlayers } from '../roomService';
import type { Player, RoomMeta } from '../types';

export interface UseRoomResult {
  meta: RoomMeta | null;
  players: Player[];
  me: Player | null;
  loading: boolean;
  error: string | null;
}

/**
 * Subscribes to a room's meta and players, keeps this tab's presence alive, and
 * hands the host badge to the longest-present connected player if the host drops.
 */
export function useRoom(
  roomCode: string | null,
  playerId: string | null,
): UseRoomResult {
  const [meta, setMeta] = useState<RoomMeta | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hostCheckRef = useRef(false);
  const metaRef = useRef<RoomMeta | null>(null);
  const playersRef = useRef<Player[]>([]);
  const requestKey = roomCode && playerId ? `${roomCode}:${playerId}` : null;

  useEffect(() => {
    if (!roomCode || !playerId) {
      setMeta(null);
      setPlayers([]);
      setLoadedKey(null);
      metaRef.current = null;
      playersRef.current = [];
      return;
    }

    const key = `${roomCode}:${playerId}`;
    const database = db;
    if (!database) {
      setLoadedKey(key);
      setError(
        'Firebase is not configured. Set VITE_FIREBASE_DATABASE_URL and VITE_FIREBASE_PROJECT_ID, or check src/shared/firebase.ts.',
      );
      return;
    }

    let cancelled = false;
    let metaLoaded = false;
    let playersLoaded = false;

    setError(null);

    const finishLoading = () => {
      if (!cancelled && metaLoaded && playersLoaded) setLoadedKey(key);
    };

    const maybeClaimHost = (list: Player[]) => {
      const host = list.find((player) => player.isHost);
      if (host?.connected) return;

      const candidates = list
        .filter((player) => player.connected)
        .sort((a, b) => a.joinOrder - b.joinOrder);
      if (candidates[0]?.id !== playerId) return;
      if (hostCheckRef.current) return;

      hostCheckRef.current = true;
      claimHost(roomCode, playerId, metaRef.current?.hostId ?? null)
        .catch((claimError: unknown) => {
          console.warn('Host hand-over failed.', getErrorMessage(claimError));
        })
        .finally(() => {
          hostCheckRef.current = false;
        });
    };

    const unsubscribeMeta = subscribeMeta(
      roomCode,
      (nextMeta) => {
        metaLoaded = true;
        metaRef.current = nextMeta;
        if (!nextMeta) {
          if (!cancelled) {
            setMeta(null);
            setError('Room not found. It may have been closed.');
          }
        } else if (!cancelled) {
          setMeta(nextMeta);
          // If players arrived first, the host check may have run before the
          // meta snapshot was available. Retry now that both are loaded.
          if (playersLoaded) maybeClaimHost(playersRef.current);
        }
        finishLoading();
      },
      (message) => {
        metaLoaded = true;
        if (!cancelled) {
          setError(message);
          setLoadedKey(key);
        }
      },
    );

    const unsubscribePlayers = subscribePlayers(
      roomCode,
      (list) => {
        playersLoaded = true;
        playersRef.current = list;
        if (!cancelled) {
          setPlayers(list);
          maybeClaimHost(list);
        }
        finishLoading();
      },
      (message) => {
        playersLoaded = true;
        if (!cancelled) {
          setError(message);
          setLoadedKey(key);
        }
      },
    );

    const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
    get(playerRef)
      .then((snapshot) => {
        if (cancelled || !snapshot.exists()) return;
        return update(playerRef, { connected: true }).then(() =>
          onDisconnect(ref(database, `rooms/${roomCode}/players/${playerId}/connected`)).set(
            false,
          ),
        );
      })
      .catch((presenceError: unknown) => {
        console.warn('Presence update failed.', getErrorMessage(presenceError));
      });

    return () => {
      cancelled = true;
      unsubscribeMeta();
      unsubscribePlayers();
      // Presence is handled by onDisconnect when the tab closes.
    };
  }, [roomCode, playerId]);

  const me = players.find((player) => player.id === playerId) ?? null;
  const loading = Boolean(requestKey) && loadedKey !== requestKey;

  return { meta, players, me, loading, error };
}
