"use client";

import { useEffect, useRef, useState } from "react";
import { onValue, ref, update } from "firebase/database";
import { emulatorMode, getDb } from "@/lib/firebase";
import { getPlayerId, getPlayerName } from "@/lib/identity";
import { bindPresence, ensureHost, enterRoom, watchRoom } from "@/lib/lobby-service";
import { LobbyError, toLobbyError, type RoomView } from "@/lib/types";

export type LobbyStatus = "connecting" | "ready" | "error";

export interface LobbyConnection {
  room: RoomView | null;
  status: LobbyStatus;
  error: LobbyError | null;
  linkOnline: boolean;
  youId: string;
  emulator: boolean;
}

/**
 * Owns the room lifecycle: create-or-join, presence, live subscription,
 * host migration and seat cleanup. Screens just render the result.
 */
export function useLobby(code: string): LobbyConnection {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [status, setStatus] = useState<LobbyStatus>("connecting");
  const [error, setError] = useState<LobbyError | null>(null);
  const [linkOnline, setLinkOnline] = useState(false);
  const [youId, setYouId] = useState("");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    let stopRoom = () => {};
    let stopPresence = () => {};
    let stopInfo = () => {};
    let db: ReturnType<typeof getDb> | null = null;
    let playerId = "";

    const create =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("create") === "1";

    try {
      db = getDb();
      playerId = getPlayerId();
      setYouId(playerId);

      void (async () => {
        try {
          await enterRoom({ db: db!, code, playerId, name: getPlayerName(), create });
          if (cancelled) return;

          if (create) {
            window.history.replaceState(null, "", `/room/${code}`);
          }

          stopInfo = onValue(ref(db!, ".info/connected"), (snapshot) => {
            setLinkOnline(snapshot.val() === true);
          });

          stopPresence = bindPresence(db!, code, playerId);

          stopRoom = watchRoom(
            db!,
            code,
            (nextRoom) => {
              if (cancelled) return;
              if (!nextRoom) {
                setError(new LobbyError("room-not-found", "This room no longer exists."));
                setStatus("error");
                return;
              }
              setRoom(nextRoom);
              setStatus("ready");
              void ensureHost(
                db!,
                code,
                Object.fromEntries(nextRoom.players.map((player) => [player.id, player])),
              );
            },
            (roomError) => {
              if (cancelled) return;
              setError(roomError);
              setStatus("error");
            },
          );
        } catch (enterError) {
          if (cancelled) return;
          setError(toLobbyError(enterError));
          setStatus("error");
        }
      })();
    } catch (initError) {
      setError(toLobbyError(initError));
      setStatus("error");
    }

    return () => {
      cancelled = true;
      mounted.current = false;
      stopRoom();
      stopPresence();
      stopInfo();
      // Leaving the screen keeps the seat but marks it offline, so a refresh
      // looks like a drop (held for two minutes) instead of a silent ghost.
      if (db && playerId) {
        update(ref(db, `rooms/${code}/players/${playerId}`), { connected: false }).catch(() => {});
      }
    };
  }, [code]);

  return { room, status, error, linkOnline, youId, emulator: emulatorMode };
}
