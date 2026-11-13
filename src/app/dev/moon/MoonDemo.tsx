"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { TutorialProvider } from "@/components/TutorialProvider";
import { PLAYER_COLORS } from "@/lib/types";
import {
  clamp,
  EMPTY_RESOURCES,
  getCraft,
  type MissionPlan,
  type PlanDraft,
  type PlanningPlayer,
  type ResourceKey,
} from "@/game/planning";
import MoonScene from "@/scenes/moon";
import { HudButton } from "@/scenes/moon/ui";
import { missionConfig } from "@/scenes/moon/config";

const CALLSIGNS = ["Vega", "Orion", "Lyra", "Nova"];

function createPlayers(count: number): PlanningPlayer[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `mock-${index + 1}`,
    name: CALLSIGNS[index] ?? `Crew ${index + 1}`,
    color: PLAYER_COLORS[index] ?? PLAYER_COLORS[0],
    joinOrder: index,
    isHost: index === 0,
    connected: true,
  }));
}

function startingDraft(): PlanDraft {
  const resources = { ...EMPTY_RESOURCES };
  for (const need of missionConfig.needs) resources[need.key] = need.min;
  return {
    craftId: null,
    resources,
    readyPlayerIds: [],
    lastEditedBy: null,
    updatedAt: 0,
  };
}

export function MoonDemo({
  crewSize,
  seatIndex = 0,
}: {
  crewSize: number;
  seatIndex?: number;
}) {
  const players = useMemo(() => createPlayers(crewSize), [crewSize]);
  const me = players[seatIndex] ?? players[0];
  const crewmates = players.filter((player) => player.id !== me.id);
  const [draft, setDraft] = useState<PlanDraft>(startingDraft);
  const [launched, setLaunched] = useState<MissionPlan | null>(null);

  const updateDraft = useCallback(
    async (patch: Partial<Pick<PlanDraft, "craftId" | "resources">>) => {
      setDraft((previous) => ({
        ...previous,
        ...patch,
        lastEditedBy: me.id,
        updatedAt: Date.now(),
      }));
    },
    [me.id],
  );

  const toggleReady = useCallback(async () => {
    setDraft((previous) => {
      const ready = previous.readyPlayerIds.includes(me.id);
      return {
        ...previous,
        readyPlayerIds: ready
          ? previous.readyPlayerIds.filter((id) => id !== me.id)
          : [...previous.readyPlayerIds, me.id],
        lastEditedBy: me.id,
        updatedAt: Date.now(),
      };
    });
  }, [me.id]);

  const launch = useCallback(async (plan: MissionPlan) => {
    setLaunched(plan);
  }, []);

  const crewReady =
    crewmates.length > 0 &&
    crewmates.every((player) => draft.readyPlayerIds.includes(player.id));

  function toggleCrew() {
    setDraft((previous) => {
      const others = crewmates.map((player) => player.id);
      const allIn = others.every((id) => previous.readyPlayerIds.includes(id));
      return {
        ...previous,
        readyPlayerIds: allIn
          ? previous.readyPlayerIds.filter((id) => !others.includes(id))
          : [...new Set([...previous.readyPlayerIds, ...others])],
        updatedAt: Date.now(),
      };
    });
  }

  function simulateCrewEdit() {
    const editor = crewmates[0] ?? players[0];
    setDraft((previous) => {
      const need = missionConfig.needs[0];
      const nextValue = clamp(previous.resources[need.key] + 7, 0, need.max);
      const resources = { ...previous.resources, [need.key]: nextValue } as Record<
        ResourceKey,
        number
      >;
      return {
        ...previous,
        resources,
        lastEditedBy: editor.id,
        updatedAt: Date.now(),
      };
    });
  }

  function reset() {
    setDraft(startingDraft());
    setLaunched(null);
  }

  const launchedCraft = launched ? getCraft(missionConfig, launched.craftId) : null;

  return (
    <TutorialProvider phase="moon">
      <MoonScene
        roomCode="DEV"
        me={me}
        players={players}
        missionId="moon"
        draft={draft}
        updateDraft={updateDraft}
        toggleReady={toggleReady}
        launch={launch}
      />

      <div className="fixed bottom-3 left-3 z-40 flex flex-wrap items-center gap-1.5 rounded-full border border-line bg-panel/95 px-2 py-1 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.9)] backdrop-blur">
        <span className="px-1 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
          demo · {crewSize}p
          {crewSize > 1 ? ` · seat ${seatIndex + 1}` : ""}
        </span>
        <DemoLink href={`/dev/moon?mock=${crewSize}&seat=${seatIndex}`}>
          reload
        </DemoLink>
        {crewSize > 1 ? (
          <DemoButton onClick={toggleCrew} active={crewReady}>
            crew lock-in
          </DemoButton>
        ) : null}
        {crewSize > 1 ? (
          <DemoButton onClick={simulateCrewEdit}>crew edit</DemoButton>
        ) : null}
        <DemoButton onClick={reset}>reset</DemoButton>
        <DemoLink
          href={`/dev/moon?mock=${crewSize}&seat=${seatIndex}&tutorial=reset`}
        >
          tutorial
        </DemoLink>
      </div>

      {launched ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-void/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="launch-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-crew/40 bg-panel p-5 shadow-[0_30px_90px_-30px_rgba(94,234,212,0.55)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-crew">
              Plan locked
            </p>
            <h2 id="launch-title" className="mt-1 text-xl font-semibold text-white">
              {missionConfig.title}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Launch handoff is ready. The decision phase (M4) takes over from
              here — this preview stops at the launch call.
            </p>

            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-line bg-void/50 p-2">
                <dt className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
                  Score
                </dt>
                <dd className="mt-0.5 font-mono text-lg text-crew">
                  {launched.score}
                </dd>
              </div>
              <div className="rounded-lg border border-line bg-void/50 p-2">
                <dt className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
                  Mass
                </dt>
                <dd className="mt-0.5 font-mono text-lg text-slate-200">
                  {launched.massUsed}
                  <span className="text-xs text-slate-500">
                    /{launched.massBudget}
                  </span>
                </dd>
              </div>
              <div className="rounded-lg border border-line bg-void/50 p-2">
                <dt className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
                  Lander
                </dt>
                <dd className="mt-0.5 truncate text-[11px] font-medium text-slate-200">
                  {launchedCraft?.name ?? "None"}
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setLaunched(null)}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-crew/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crew"
              >
                Back to plan
              </button>
              <HudButton
                variant="primary"
                autoFocus
                onClick={() => {
                  setLaunched(null);
                  reset();
                }}
              >
                Reset preview
              </HudButton>
            </div>
          </div>
        </div>
      ) : null}
    </TutorialProvider>
  );
}

function DemoButton({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "rounded-full border border-crew/40 bg-crew/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-crew focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crew"
          : "rounded-full border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-slate-400 transition hover:border-crew/40 hover:text-crew focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crew"
      }
    >
      {children}
    </button>
  );
}

function DemoLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className="rounded-full border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-slate-400 transition hover:border-crew/40 hover:text-crew focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crew"
    >
      {children}
    </a>
  );
}
