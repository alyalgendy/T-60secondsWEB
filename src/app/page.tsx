"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MarkerSlot } from "@/components/MarkerBadge";
import { TutorialProvider, useTutorialAnchor } from "@/components/TutorialProvider";
import { cn } from "@/lib/cn";
import { emulatorMode } from "@/lib/firebase";
import { getPlayerName, setPlayerName } from "@/lib/identity";
import { getLandingMarkers } from "@/lib/markers";
import { generateRoomCode, isValidRoomCode, normalizeRoomCode } from "@/lib/room-code";

export default function LandingPage() {
  return (
    <TutorialProvider phase="landing">
      <Landing />
    </TutorialProvider>
  );
}

function Landing() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameActive = useTutorialAnchor("name-field");
  const createActive = useTutorialAnchor("create-button");
  const joinActive = useTutorialAnchor("join-button");

  useEffect(() => {
    setName(getPlayerName());
    setHydrated(true);
  }, []);

  const markers = getLandingMarkers({ name, code });

  function rememberName(): string {
    const clean = name.trim() || getPlayerName();
    setPlayerName(clean);
    return clean;
  }

  function handleCreate() {
    rememberName();
    router.push(`/room/${generateRoomCode()}?create=1`);
  }

  function handleJoin() {
    const normalized = normalizeRoomCode(code);
    if (!isValidRoomCode(normalized)) {
      setError("Room codes are five characters. Check it and try again.");
      return;
    }
    setError(null);
    rememberName();
    router.push(`/room/${normalized}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg border border-crew/40 bg-crew/10 font-mono text-xs font-bold text-crew">
            T60
          </span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">
              Mission control
            </p>
            <p className="text-sm font-medium text-slate-200">Crew assembly</p>
          </div>
        </div>
        <div className="text-right font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600">
          <p>build 0.1 · online lobby</p>
          <p className={cn("mt-1", emulatorMode ? "text-warn" : "text-crew")}>
            {emulatorMode ? "local emulator" : "firebase live"}
          </p>
        </div>
      </header>

      <div className="mt-12 grid flex-1 gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
        <section>
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-crew">
            Co-op · 1–4 crew · turn-based
          </p>
          <h1 className="mt-4 max-w-xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl">
            Four seats. One ship. Sixty seconds to grab what matters.
          </h1>
          <p className="mt-4 max-w-lg text-pretty leading-relaxed text-slate-400">
            Strip the supply bay together, cut the pile down to what actually fits, then survive a
            turn-based mission where every choice spends something you needed.
          </p>

          <div className="mt-8 rounded-2xl border border-line bg-panel/70 p-5 shadow-[0_30px_80px_-40px_rgba(94,234,212,0.35)] backdrop-blur">
            <label
              htmlFor="callsign"
              className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500"
            >
              Call sign
            </label>
            <input
              id="callsign"
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, 16))}
              placeholder={hydrated ? "e.g. Vega 42" : ""}
              autoComplete="off"
              spellCheck={false}
              className={cn(
                "mt-2 w-full rounded-lg border bg-void/80 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600",
                nameActive
                  ? "border-crew ring-2 ring-crew/40"
                  : "border-line focus:border-crew/60 focus:ring-2 focus:ring-crew/20",
              )}
            />
            <MarkerSlot markers={markers} anchor="name-field" className="mt-2" />

            <button
              type="button"
              onClick={handleCreate}
              disabled={!name.trim()}
              className={cn(
                "mt-4 w-full rounded-lg bg-crew px-4 py-2.5 text-sm font-semibold text-void transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40",
                createActive && "ring-2 ring-crew/60 ring-offset-2 ring-offset-panel",
              )}
            >
              Create a room
            </button>
            <MarkerSlot markers={markers} anchor="create-button" className="mt-2" />

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-600">
                or join a crew
              </span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <div className="flex gap-2">
              <input
                value={code}
                onChange={(event) => {
                  setCode(normalizeRoomCode(event.target.value));
                  setError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleJoin();
                }}
                placeholder="ABCDE"
                aria-label="Room code"
                autoComplete="off"
                spellCheck={false}
                maxLength={5}
                className="w-full rounded-lg border border-line bg-void/80 px-3 py-2.5 font-mono text-sm uppercase tracking-[0.35em] text-crew outline-none transition placeholder:text-slate-700 focus:border-crew/60 focus:ring-2 focus:ring-crew/20"
              />
              <button
                type="button"
                onClick={handleJoin}
                className={cn(
                  "shrink-0 rounded-lg border border-line bg-panel px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-crew/50 hover:text-white",
                  joinActive && "border-crew ring-2 ring-crew/40",
                )}
              >
                Join
              </button>
            </div>
            <MarkerSlot markers={markers} anchor="join-button" className="mt-2" />
            {error ? <p className="mt-3 text-xs text-alert">{error}</p> : null}
          </div>

          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600">
            No accounts · rooms are temporary · nothing to install
          </p>
        </section>

        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border border-line bg-panel/60 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">
              How a run works
            </p>
            <ol className="mt-4 space-y-4">
              {[
                ["01", "Grab", "Sixty seconds in a shared supply bay. First click wins, cooldown keeps it fair."],
                ["02", "Pack", "You always grab more than the ship can carry. Cut the pile to fit."],
                ["03", "Fly", "Every turn throws a crisis with three options and real costs."],
                ["04", "Survive", "Oxygen, food and fuel decide if anyone comes home."],
              ].map(([step, title, body]) => (
                <li key={step} className="flex gap-3">
                  <span className="font-mono text-[10px] text-crew/70">{step}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div id="how-it-works" className="mt-5 border-t border-line pt-4">
              <p className="text-xs leading-relaxed text-slate-500">
                This build ships the online lobby. Steps 01–04 arrive one at a time, and each one
                lands with its briefing and markers already wired in.
              </p>
            </div>
          </div>

          <Link
            href="/?tutorial=reset"
            className="self-start font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600 transition hover:text-crew"
          >
            Replay the briefing →
          </Link>

          <div className="mt-auto rounded-2xl border border-line/70 bg-panel/40 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-600">
              System status
            </p>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Lobby sync</dt>
                <dd className="font-mono text-crew">operational</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Transport</dt>
                <dd className="font-mono text-slate-400">
                  {emulatorMode ? "local rtdb" : "firebase rtdb"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Seats</dt>
                <dd className="font-mono text-slate-400">4 max</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>

      <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-700">
        <span>t-60 seconds · mission control</span>
        <span>presence + host migration + reconnect</span>
      </footer>
    </main>
  );
}
