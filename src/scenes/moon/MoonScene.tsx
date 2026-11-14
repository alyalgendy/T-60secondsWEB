"use client";

import { useState } from "react";
import { MarkerSlot } from "@/components/MarkerBadge";
import { useTutorialAnchor } from "@/components/TutorialProvider";
import { cn } from "@/lib/cn";
import { getMoonMarkers } from "@/lib/markers";
import {
  checkLaunch,
  clamp,
  getCraft,
  planFromDraft,
  scorePlan,
  type CraftOption,
  type PlanningSceneProps,
  type ResourceCoverage,
  type ResourceKey,
} from "@/game/planning";
import { missionConfig } from "./config";
import {
  FactCard,
  GaugeBar,
  HudButton,
  HudFrame,
  HudPanel,
  PlayerBadge,
  ReadyBar,
  ResourceSlider,
  RiskPill,
  StatusPill,
  type GaugeTone,
} from "./ui";

const COVERAGE_TONE: Record<ResourceCoverage["status"], GaugeTone> = {
  "below-min": "danger",
  tight: "warn",
  safe: "ok",
};

const COVERAGE_GLYPH: Record<ResourceCoverage["status"], string> = {
  "below-min": "✕",
  tight: "▲",
  safe: "✓",
};

const COVERAGE_LABEL: Record<ResourceCoverage["status"], string> = {
  "below-min": "below minimum",
  tight: "tight",
  safe: "safe",
};

export default function MoonScene({
  roomCode,
  me,
  players,
  draft,
  updateDraft,
  toggleReady,
  launch,
}: PlanningSceneProps) {
  const [actionError, setActionError] = useState<string | null>(null);

  const briefActive = useTutorialAnchor("moon-brief");
  const craftActive = useTutorialAnchor("moon-craft");
  const resourcesActive = useTutorialAnchor("moon-resources");
  const statusActive = useTutorialAnchor("moon-status");
  const readyActive = useTutorialAnchor("moon-ready");
  const launchActive = useTutorialAnchor("moon-launch");

  const score = scorePlan(missionConfig, draft);
  const launchCheck = checkLaunch(missionConfig, draft);
  const markers = getMoonMarkers({
    config: missionConfig,
    draft,
    players,
    youId: me.id,
  });

  const readyIds = draft.readyPlayerIds;
  const readySet = new Set(readyIds);
  const connected = players.filter((player) => player.connected);
  const waiting = connected.filter((player) => !readySet.has(player.id));
  const meReady = readySet.has(me.id);
  const allReady = connected.length > 0 && waiting.length === 0;

  const lastEditor = draft.lastEditedBy
    ? players.find((player) => player.id === draft.lastEditedBy) ?? null
    : null;

  const selectedCraft = getCraft(missionConfig, draft.craftId);
  const overBudget = score.massUsed > score.massBudget;
  const reserve = score.massBudget - score.massUsed;

  const blocking = [...launchCheck.reasons];
  if (!allReady) {
    blocking.push(
      waiting.length > 0
        ? `Waiting on ${waiting.map((player) => player.name).join(", ")}.`
        : "Waiting for the crew to connect.",
    );
  }
  const canLaunch = me.isHost && allReady && launchCheck.ok;

  function run(action: () => Promise<void>) {
    setActionError(null);
    action().catch((error: unknown) => {
      setActionError(
        error instanceof Error ? error.message : "That action did not go through.",
      );
    });
  }

  function chooseCraft(craft: CraftOption) {
    if (draft.craftId === craft.id) return;
    run(() => updateDraft({ craftId: craft.id }));
  }

  function setResource(key: ResourceKey, value: number) {
    const need = missionConfig.needs.find((item) => item.key === key);
    if (!need) return;
    const next = clamp(Math.round(value), 0, need.max);
    if (next === draft.resources[key]) return;
    run(() =>
      updateDraft({
        resources: { ...draft.resources, [key]: next },
      }),
    );
  }

  function handleLaunch() {
    const plan = planFromDraft(missionConfig, draft);
    run(() => launch(plan));
  }

  return (
    <HudFrame
      missionLabel="Moon"
      stepLabel="Mission planning · Artemis Surface Sortie"
      roomCode={roomCode || "DEV"}
      players={players}
      readyIds={readyIds}
      youId={me.id}
    >
      <div className="grid min-h-0 grid-cols-1 gap-3 lg:h-full lg:grid-cols-[minmax(220px,0.78fr)_minmax(360px,1.32fr)_minmax(250px,0.9fr)]">
        {/* ------------------------------------------------ Mission brief */}
        <HudPanel
          title="Mission Brief"
          kicker="Lunar South Pole"
          anchorId="moon-brief"
          className={cn(
            briefActive && "ring-2 ring-crew/60 ring-offset-2 ring-offset-void",
          )}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-full border border-slate-500/40 bg-[radial-gradient(circle_at_35%_30%,#e2e8f0,#94a3b8_45%,#334155)] text-base text-void shadow-[0_0_18px_rgba(226,232,240,0.2)]"
              aria-hidden
            >
              ☾
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-slate-500">
                Destination
              </p>
              <p className="truncate text-sm font-semibold text-white">
                {missionConfig.destination}
              </p>
            </div>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
            {missionConfig.goal}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-line/60 bg-void/40 px-2 py-1.5">
              <p className="font-mono text-[9px] uppercase tracking-wider text-slate-600">
                Surface stay
              </p>
              <p className="font-mono text-xs text-slate-200">
                {missionConfig.durationDays} days
              </p>
            </div>
            <div className="rounded-lg border border-line/60 bg-void/40 px-2 py-1.5">
              <p className="font-mono text-[9px] uppercase tracking-wider text-slate-600">
                Crew
              </p>
              <p className="font-mono text-xs text-slate-200">
                {connected.length} aboard
              </p>
            </div>
          </div>

          <MarkerSlot markers={markers} anchor="moon-brief" className="mt-2" />

          <div className="mt-3 space-y-1.5" aria-label="Why the South Pole">
            {missionConfig.facts.map((fact, index) => (
              <FactCard key={fact.text} fact={fact} index={index} />
            ))}
          </div>

          <p className="mt-3 border-t border-line/60 pt-2 font-mono text-[9px] leading-relaxed text-slate-600">
            Resources, mass and cost are game units. Real figures appear only in
            the cited facts.
          </p>
        </HudPanel>

        {/* ------------------------------------------------ Plan builder */}
        <HudPanel
          title="Plan Builder"
          kicker="One live draft, edited by the whole crew"
          anchorId="moon-craft"
          badge={
            lastEditor ? (
              <PlayerBadge
                player={lastEditor}
                size="sm"
                label={lastEditor.id === me.id ? "you" : "last edit"}
              />
            ) : (
              <StatusPill tone="info">live draft</StatusPill>
            )
          }
          className={cn(
            (craftActive || resourcesActive) &&
              "ring-2 ring-crew/60 ring-offset-2 ring-offset-void",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-slate-500">
              01 · Surface access
            </p>
            <span className="font-mono text-[9px] text-slate-700">
              pick one
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label="Lunar lander"
            className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-3"
          >
            {missionConfig.crafts.map((craft) => {
              const selected = craft.id === draft.craftId;
              return (
                <button
                  key={craft.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => chooseCraft(craft)}
                  className={cn(
                    "flex h-full min-h-[62px] flex-col justify-between rounded-lg border px-2 py-1.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crew focus-visible:ring-offset-2 focus-visible:ring-offset-void motion-reduce:transition-none",
                    selected
                      ? "border-crew/60 bg-crew/10"
                      : "border-line/70 bg-void/40 hover:border-crew/40",
                  )}
                >
                  <span className="flex items-start justify-between gap-1">
                    <span className="text-[11px] font-semibold leading-tight text-white">
                      <span
                        className={cn("mr-1", selected ? "text-crew" : "text-slate-600")}
                        aria-hidden
                      >
                        {selected ? "✓" : "○"}
                      </span>
                      {craft.name}
                    </span>
                    <RiskPill risk={craft.risk ?? "medium"} />
                  </span>
                  <span className="mt-1 block font-mono text-[9px] leading-tight text-slate-500">
                    bay {craft.massCapacity} · seats {craft.crewCapacity}
                    <br />
                    <span title="Game balance only — not a real price">
                      cost {craft.cost ?? 0} game units
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-1.5 rounded-lg border border-line/60 bg-void/30 px-2.5 py-1.5">
            {selectedCraft ? (
              <>
                <p className="text-[10px] leading-relaxed text-slate-400">
                  {selectedCraft.description}
                </p>
                <div className="mt-1 grid gap-x-3 gap-y-0.5 sm:grid-cols-2">
                  {selectedCraft.pros.map((pro) => (
                    <p key={pro} className="text-[10px] leading-tight text-slate-400">
                      <span className="text-crew" aria-hidden>
                        +{" "}
                      </span>
                      {pro}
                    </p>
                  ))}
                  {selectedCraft.cons.map((con) => (
                    <p key={con} className="text-[10px] leading-tight text-slate-400">
                      <span className="text-warn" aria-hidden>
                        −{" "}
                      </span>
                      {con}
                    </p>
                  ))}
                </div>
                {selectedCraft.source ? (
                  <a
                    href={selectedCraft.source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[10px] text-crew/80 underline decoration-crew/30 underline-offset-2 transition hover:text-crew focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crew"
                  >
                    {selectedCraft.source.title}
                    <span aria-hidden>↗</span>
                  </a>
                ) : null}
              </>
            ) : (
              <p className="text-[10px] text-slate-500">
                Choose a lander to set the mass budget. Heavier ships carry more,
                but cost more and add risk.
              </p>
            )}
          </div>

          <MarkerSlot markers={markers} anchor="moon-craft" className="mt-1.5" />

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/60 pt-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-slate-500">
              02 · Resources
            </p>
            <span className="font-mono text-[9px] text-slate-700">
              {missionConfig.needs.length} lines
            </span>
          </div>
          <MarkerSlot markers={markers} anchor="moon-resources" className="mt-1" />

          <div className="mt-1.5 grid grid-cols-1 gap-1 xl:grid-cols-2">
            {missionConfig.needs.map((need) => (
              <ResourceSlider
                key={need.key}
                need={need}
                value={draft.resources[need.key] ?? 0}
                onChange={(value) => setResource(need.key, value)}
              />
            ))}
          </div>
        </HudPanel>

        {/* ------------------------------------------------ Mission status */}
        <div className="flex min-h-0 flex-col gap-3">
          <HudPanel
            title="Mission Status"
            kicker="Live score preview"
            anchorId="moon-status"
            className={cn(
              "shrink-0",
              statusActive && "ring-2 ring-crew/60 ring-offset-2 ring-offset-void",
            )}
          >
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-slate-500">
                  Mass used
                </p>
                <p className="mt-0.5 font-mono text-xl leading-none text-white">
                  {score.massUsed}
                  <span className="text-sm text-slate-500">
                    {" "}
                    / {selectedCraft ? score.massBudget : "—"}
                  </span>
                </p>
              </div>
              <StatusPill
                tone={!selectedCraft ? "info" : overBudget ? "danger" : "ok"}
              >
                {!selectedCraft
                  ? "pick a lander"
                  : overBudget
                    ? `${score.massUsed - score.massBudget} over`
                    : `${reserve} spare`}
              </StatusPill>
            </div>
            <GaugeBar
              className="mt-2"
              label="Mass used — the lander you pick sets the budget"
              value={score.massUsed}
              max={Math.max(score.massBudget, 1)}
              tone={!selectedCraft ? "neutral" : overBudget ? "danger" : "ok"}
            />

            <div className="mt-3 flex items-end justify-between gap-2 border-t border-line/60 pt-2">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-slate-500">
                  Plan score
                </p>
                <p
                  className={cn(
                    "mt-0.5 font-mono text-2xl leading-none",
                    !selectedCraft
                      ? "text-slate-200"
                      : !launchCheck.ok
                        ? "text-alert"
                        : score.score >= 80
                          ? "text-crew"
                          : score.score >= 60
                            ? "text-warn"
                            : "text-alert",
                  )}
                  aria-live="polite"
                >
                  {score.score}
                  <span className="text-xs text-slate-600"> / 100</span>
                </p>
              </div>
              <StatusPill
                tone={
                  !selectedCraft
                    ? "info"
                    : !launchCheck.ok
                      ? "danger"
                      : score.score >= 80
                        ? "ok"
                        : score.score >= 60
                          ? "warn"
                          : "danger"
                }
              >
                {!selectedCraft
                  ? "resources only"
                  : !launchCheck.ok
                    ? "blocked"
                    : score.score >= 80
                      ? "strong margin"
                      : score.score >= 60
                        ? "workable"
                        : "risky"}
              </StatusPill>
            </div>

            <MarkerSlot markers={markers} anchor="moon-status" className="mt-2" />

            <ul className="mt-2 space-y-1" aria-label="Resource coverage">
              {score.coverage.map((item) => (
                <li key={item.key} className="flex items-center gap-2">
                  <span className="w-14 shrink-0 truncate text-[10px] text-slate-400">
                    {item.label}
                  </span>
                  <GaugeBar
                    className="min-w-0 flex-1"
                    label={`${item.label} coverage`}
                    value={item.value}
                    max={item.max}
                    min={item.min}
                    ideal={item.ideal}
                    tone={COVERAGE_TONE[item.status]}
                  />
                  <span className="w-6 shrink-0 text-right font-mono text-[10px] text-slate-300">
                    {item.value}
                  </span>
                  <span
                    className={cn(
                      "w-3 shrink-0 text-center text-[10px]",
                      item.status === "safe"
                        ? "text-crew"
                        : item.status === "tight"
                          ? "text-warn"
                          : "text-alert",
                    )}
                    title={COVERAGE_LABEL[item.status]}
                    aria-label={COVERAGE_LABEL[item.status]}
                  >
                    {COVERAGE_GLYPH[item.status]}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 font-mono text-[9px] text-slate-600">
              amber tick = minimum · white tick = ideal
            </p>
          </HudPanel>

          <HudPanel
            title="Crew & Launch"
            kicker="Everyone locks in, then the Commander launches"
            anchorId="moon-ready"
            className={cn(
              "min-h-0 flex-1",
              (readyActive || launchActive) &&
                "ring-2 ring-crew/60 ring-offset-2 ring-offset-void",
            )}
            bodyClassName="flex flex-col"
          >
            <ReadyBar players={players} readyIds={readyIds} youId={me.id} />
            <MarkerSlot markers={markers} anchor="moon-ready" className="mt-1.5" />
            <MarkerSlot markers={markers} anchor="moon-launch" className="mt-1.5" />

            <div className="mt-auto border-t border-line/60 pt-2">
              <div className="flex flex-wrap gap-2">
                <HudButton
                  variant={meReady ? "ghost" : "primary"}
                  onClick={() => run(toggleReady)}
                  aria-pressed={meReady}
                  className="flex-1"
                >
                  {meReady ? "Unlock plan" : "Lock plan"}
                </HudButton>

                {me.isHost ? (
                  <HudButton
                    variant={canLaunch ? "primary" : "ghost"}
                    disabled={!canLaunch}
                    onClick={handleLaunch}
                    className="flex-1"
                  >
                    Launch mission
                  </HudButton>
                ) : null}
              </div>

              {me.isHost ? (
                !canLaunch && blocking.length > 0 ? (
                  <ul className="mt-1.5 max-h-20 space-y-0.5 overflow-y-auto pr-1">
                    {blocking.map((reason) => (
                      <li
                        key={reason}
                        className="flex items-start gap-1 text-[10px] leading-tight text-warn"
                      >
                        <span aria-hidden>▲</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1.5 flex items-center gap-1 text-[10px] text-crew">
                    <span aria-hidden>✓</span>
                    Cleared to launch.
                  </p>
                )
              ) : (
                <p className="mt-1.5 text-[10px] leading-tight text-slate-500">
                  {allReady
                    ? launchCheck.ok
                      ? "All crew locked in. The Commander can launch."
                      : "All crew locked in. The plan still has launch blockers."
                    : "The Commander launches once every crew member locks in."}
                </p>
              )}
            </div>
          </HudPanel>
        </div>
      </div>

      {actionError ? (
        <div
          role="alert"
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-alert/50 bg-panel px-3 py-2 text-xs text-alert shadow-lg"
        >
          {actionError}
        </div>
      ) : null}
    </HudFrame>
  );
}
