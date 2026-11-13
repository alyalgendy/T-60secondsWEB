"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MarkerSlot } from "@/components/MarkerBadge";
import { TutorialProvider, useTutorialAnchor } from "@/components/TutorialProvider";
import { useLobby, type LobbyConnection } from "@/hooks/useLobby";
import { cn } from "@/lib/cn";
import { emulatorMode, getDb } from "@/lib/firebase";
import { kickPlayer, leaveRoom, returnToLobby, setReady, startPreflight } from "@/lib/lobby-service";
import { getLobbyMarkers } from "@/lib/markers";
import { roomLink } from "@/lib/room-code";
import { MAX_PLAYERS, toLobbyError, type PlayerView, type RoomView } from "@/lib/types";

export function RoomScreen({ code }: { code: string }) {
  return (
    <TutorialProvider phase="lobby">
      <Room code={code} />
    </TutorialProvider>
  );
}

function Room({ code }: { code: string }) {
  const router = useRouter();
  const lobby = useLobby(code);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const readyActive = useTutorialAnchor("ready-button");
  const startActive = useTutorialAnchor("start-button");
  const inviteActive = useTutorialAnchor("invite-card");

  if (lobby.status === "error") {
    return <RoomError code={code} error={lobby.error?.message ?? "Could not reach this room."} />;
  }

  if (!lobby.room) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center px-5 py-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-crew">Uplink</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">Joining room {code || "—"}</h1>
        <p className="mt-2 text-sm text-slate-500">Establishing a link and taking a seat…</p>
        <div className="mt-6 h-1 w-40 overflow-hidden rounded-full bg-line">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-crew" />
        </div>
      </main>
    );
  }

  const room = lobby.room;
  const you = room.players.find((player) => player.id === lobby.youId);
  const isHost = room.hostId === lobby.youId;
  const markers = getLobbyMarkers(room, lobby.youId);

  async function act(run: () => Promise<void>) {
    setActionError(null);
    try {
      await run();
    } catch (error) {
      setActionError(toLobbyError(error).message);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(roomLink(code));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setActionError("Copy failed — select the room code manually.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 transition hover:text-crew"
        >
          ← Mission control
        </Link>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]">
            <span
              className={cn(
                "size-1.5 rounded-full",
                lobby.linkOnline ? "bg-crew shadow-[0_0_8px_#5eead4]" : "animate-pulse bg-alert",
              )}
            />
            <span className={lobby.linkOnline ? "text-crew" : "text-alert"}>
              {lobby.linkOnline ? "Link online" : "Reconnecting"}
            </span>
          </span>
          <button
            type="button"
            onClick={() => act(async () => {
              await leaveRoom(getDb(), code, lobby.youId);
              router.push("/");
            })}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600 transition hover:text-alert"
          >
            Leave
          </button>
        </div>
      </header>

      <section className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">Room</p>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="font-mono text-4xl tracking-[0.18em] text-white">{room.code}</h1>
            <button
              type="button"
              onClick={copyLink}
              className="rounded-md border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-slate-400 transition hover:border-crew/50 hover:text-crew"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600">
          {emulatorMode ? "local emulator" : "firebase live"} · {room.players.length}/{MAX_PLAYERS} seated
        </p>
      </section>

      {actionError ? (
        <p className="mt-4 rounded-lg border border-alert/40 bg-alert/10 px-3 py-2 text-xs text-alert">
          {actionError}
        </p>
      ) : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="flex flex-col gap-5">
          <PhaseBanner
            room={room}
            markers={markers}
            isHost={isHost}
            onReturn={() => act(() => returnToLobby(getDb(), code))}
          />

          <section id="crew-list" className="rounded-2xl border border-line bg-panel/60 p-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">Crew</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600">
                {room.players.filter((player) => player.connected).length} online
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {room.players.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  hostId={room.hostId}
                  youId={lobby.youId}
                  markers={markers}
                  canKick={isHost && player.id !== lobby.youId && !player.connected}
                  onKick={() => act(() => kickPlayer(getDb(), code, player.id))}
                />
              ))}

              {Array.from({ length: Math.max(0, MAX_PLAYERS - room.players.length) }).map((_, index) => (
                <div
                  key={`open-${index}`}
                  className="grid min-h-[96px] place-items-center rounded-2xl border border-dashed border-line/80 p-4 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-700"
                >
                  Open seat
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-line/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  Your status
                </p>
                <p className="mt-1 text-sm font-medium text-slate-200">
                  {you?.ready ? "Locked in" : "Standing by"}
                </p>
                <MarkerSlot markers={markers} anchor="ready-button" className="mt-2" />
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={room.phase !== "LOBBY"}
                    onClick={() => act(() => setReady(getDb(), code, lobby.youId, !you?.ready))}
                    className={cn(
                      "rounded-lg border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
                      you?.ready
                        ? "border-line bg-panel text-slate-300 hover:border-slate-500"
                        : "border-crew/60 bg-crew/10 text-crew hover:bg-crew/20",
                      readyActive && "ring-2 ring-crew/50 ring-offset-2 ring-offset-void",
                    )}
                  >
                    {you?.ready ? "Stand down" : "Lock in"}
                  </button>

                  {isHost ? (
                    <button
                      type="button"
                      disabled={room.phase !== "LOBBY" || !allConnectedReady(room)}
                      onClick={() => act(() => startPreflight(getDb(), code))}
                      className={cn(
                        "rounded-lg bg-crew px-4 py-2 text-sm font-semibold text-void transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40",
                        startActive && "ring-2 ring-crew/60 ring-offset-2 ring-offset-void",
                      )}
                    >
                      Launch preflight
                    </button>
                  ) : null}
                </div>
                <MarkerSlot markers={markers} anchor="start-button" />
              </div>
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-5">
          <section className="rounded-2xl border border-line bg-panel/60 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">
                Invite crew
              </p>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600">
                {MAX_PLAYERS - room.players.length} open
              </span>
            </div>

            <div
              className={cn(
                "mt-3 flex items-center gap-2 rounded-lg border border-line bg-void/70 p-1 pl-3",
                inviteActive && "ring-2 ring-crew/40",
              )}
            >
              <code className="min-w-0 flex-1 truncate font-mono text-xs text-crew">
                {roomLink(code)}
              </code>
              <button
                type="button"
                onClick={copyLink}
                className="shrink-0 rounded-md bg-crew px-3 py-1.5 text-xs font-semibold text-void transition hover:brightness-110"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Share the link or the five-character code. Dropped players keep their seat for two
              minutes, so a refresh costs nobody their spot.
            </p>
            <MarkerSlot markers={markers} anchor="invite-card" className="mt-3" />
          </section>

          <FlightLog room={room} />
        </aside>
      </div>

      <footer className="mt-8 border-t border-line/70 pt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>turn-based core · real-time prologue</span>
          <span>{room.phase === "LOBBY" ? "awaiting launch" : "preflight complete"}</span>
        </div>
      </footer>
    </main>
  );
}

function allConnectedReady(room: RoomView): boolean {
  const crew = room.players.filter((player) => player.connected);
  return crew.length > 0 && crew.every((player) => player.ready);
}

function PhaseBanner({
  room,
  markers,
  isHost,
  onReturn,
}: {
  room: RoomView;
  markers: ReturnType<typeof getLobbyMarkers>;
  isHost: boolean;
  onReturn: () => void;
}) {
  const locked = room.phase === "BRIEFING";

  return (
    <section
      className={cn(
        "rounded-2xl border p-4",
        locked ? "border-crew/40 bg-crew/[0.06]" : "border-line bg-panel/60",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">Phase</p>
          <p className="mt-1 text-sm font-medium text-white">
            {locked ? "Preflight locked" : "Crew assembly"}
          </p>
          <p className="mt-0.5 max-w-md text-xs leading-relaxed text-slate-500">
            {locked
              ? "Uplink verified across the crew. The 60-second scramble lands in the next build."
              : "Ready up, then the commander launches preflight."}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest",
            locked ? "border-crew/40 text-crew" : "border-line text-slate-500",
          )}
        >
          {locked ? "Briefing" : "Lobby"}
        </span>
      </div>

      <MarkerSlot markers={markers} anchor="phase-banner" className="mt-3" />

      {locked && isHost ? (
        <button
          type="button"
          onClick={onReturn}
          className="mt-3 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
        >
          Return to lobby
        </button>
      ) : null}
    </section>
  );
}

function PlayerCard({
  player,
  hostId,
  youId,
  markers,
  canKick,
  onKick,
}: {
  player: PlayerView;
  hostId: string | null;
  youId: string;
  markers: ReturnType<typeof getLobbyMarkers>;
  canKick: boolean;
  onKick: () => void;
}) {
  const isYou = player.id === youId;
  const isHost = player.id === hostId;

  return (
    <article
      className={cn(
        "rounded-2xl border p-4 transition",
        player.connected ? "border-line bg-void/40" : "border-alert/30 bg-alert/[0.04]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: player.color, boxShadow: `0 0 12px ${player.color}` }}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="truncate text-sm font-medium text-white">{player.name}</h3>
              {isYou ? (
                <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-slate-400">
                  You
                </span>
              ) : null}
              {isHost ? (
                <span className="rounded border border-crew/40 bg-crew/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-crew">
                  Commander
                </span>
              ) : null}
            </div>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
              {player.connected ? (player.ready ? "Locked in" : "Standing by") : "Signal lost"}
            </p>
          </div>
        </div>

        <span
          className={cn(
            "mt-1 size-2 shrink-0 rounded-full",
            !player.connected
              ? "bg-alert"
              : player.ready
                ? "bg-crew shadow-[0_0_8px_#5eead4]"
                : "border border-slate-600",
          )}
          aria-label={
            !player.connected ? "Offline" : player.ready ? "Ready" : "Standing by"
          }
        />
      </div>

      <MarkerSlot markers={markers} anchor={`player-${player.id}`} className="mt-3" />

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-700">
          {player.ready ? "ready" : "standby"}
        </span>
        {canKick ? (
          <button
            type="button"
            onClick={onKick}
            className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-600 transition hover:text-alert"
          >
            Remove seat
          </button>
        ) : null}
      </div>
    </article>
  );
}

function FlightLog({ room }: { room: RoomView }) {
  const listRef = useRef<HTMLOListElement | null>(null);

  useEffect(() => {
    const element = listRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [room.log.length]);

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-line bg-panel/60 p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">Flight log</p>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-700">
          live
        </span>
      </div>

      <ol ref={listRef} className="mt-3 max-h-64 flex-1 space-y-2 overflow-y-auto pr-1">
        {room.log.length === 0 ? (
          <li className="font-mono text-[11px] text-slate-600">No traffic yet.</li>
        ) : (
          room.log.map((entry) => (
            <li key={entry.id} className="flex gap-2 font-mono text-[11px] leading-relaxed">
              <span className="shrink-0 text-slate-700">{formatClock(entry.at)}</span>
              <span className="text-slate-400">{entry.text}</span>
            </li>
          ))
        )}
      </ol>
    </section>
  );
}

function formatClock(at: number): string {
  const date = new Date(at);
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

function RoomError({ code, error }: { code: string; error: string }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-5 py-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-alert">Uplink rejected</p>
      <h1 className="mt-3 text-2xl font-semibold text-white">Could not join {code || "that room"}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{error}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-lg bg-crew px-4 py-2 text-sm font-semibold text-void transition hover:brightness-110"
        >
          Back to mission control
        </Link>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
        >
          Retry
        </button>
      </div>
    </main>
  );
}
