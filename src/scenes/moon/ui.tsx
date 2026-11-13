"use client";

import type {
  ButtonHTMLAttributes,
  CSSProperties,
  ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import type {
  CraftRisk,
  Fact,
  PlanningPlayer,
  ResourceNeed,
} from "@/game/planning";
import styles from "./moon.module.css";

/* ------------------------------------------------------------------ */
/* Frame and panels                                                    */
/* ------------------------------------------------------------------ */

export function HudFrame({
  missionLabel,
  stepLabel,
  roomCode,
  players,
  readyIds,
  youId,
  children,
}: {
  missionLabel: string;
  stepLabel: string;
  roomCode: string;
  players: PlanningPlayer[];
  readyIds: string[];
  youId: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col overflow-x-hidden bg-void text-slate-200 lg:h-dvh lg:overflow-hidden",
        styles.root,
      )}
    >
      <header className="shrink-0 border-b border-line/80 bg-void/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-crew/40 bg-crew/10 font-mono text-xs font-bold text-crew">
              T60
            </span>
            <div className="min-w-0">
              <p className="truncate font-mono text-[9px] uppercase tracking-[0.3em] text-slate-500">
                Mission 02 · {missionLabel}
              </p>
              <h1 className="truncate text-sm font-semibold text-white">
                {stepLabel}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="text-right">
              <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-slate-500">
                Room
              </p>
              <p className="font-mono text-sm tracking-[0.2em] text-crew">
                {roomCode}
              </p>
            </div>
            <span className="h-8 w-px bg-line" aria-hidden />
            <ul className="flex items-center gap-1.5" aria-label="Crew">
              {players.map((player) => {
                const ready = readyIds.includes(player.id);
                return (
                  <li key={player.id}>
                    <span
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2 transition",
                        ready
                          ? "border-crew/40 bg-crew/10"
                          : "border-line bg-panel/60",
                        !player.connected && "opacity-50",
                      )}
                      title={`${player.name}${player.isHost ? " (Commander)" : ""} — ${
                        !player.connected ? "offline" : ready ? "locked in" : "standing by"
                      }`}
                      aria-label={`${player.name}${player.isHost ? ", Commander" : ""}, ${
                        !player.connected ? "offline" : ready ? "locked in" : "standing by"
                      }`}
                    >
                      <span
                        className="grid size-5 place-items-center rounded-full font-mono text-[10px] font-bold text-void"
                        style={{ backgroundColor: player.color }}
                        aria-hidden
                      >
                        {player.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="max-w-[72px] truncate font-mono text-[10px] uppercase tracking-wider text-slate-300">
                        {player.name}
                        {player.id === youId ? " · you" : ""}
                      </span>
                      <span
                        className={cn(
                          "font-mono text-[9px]",
                          ready ? "text-crew" : "text-slate-600",
                        )}
                        aria-hidden
                      >
                        {ready ? "✓" : "○"}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-3 lg:min-h-0 lg:overflow-hidden">
        {children}
      </main>
    </div>
  );
}

export function HudPanel({
  title,
  kicker,
  badge,
  children,
  className,
  bodyClassName,
  anchorId,
}: {
  title: string;
  kicker?: string;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  anchorId?: string;
}) {
  return (
    <section
      id={anchorId}
      className={cn(
        "relative flex min-h-0 flex-col rounded-xl border border-line bg-panel/70",
        styles.panel,
        className,
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-line/70 px-3 py-2">
        <div className="min-w-0">
          <h2 className="truncate font-mono text-[10px] uppercase tracking-[0.28em] text-slate-300">
            {title}
          </h2>
          {kicker ? (
            <p className="truncate text-[10px] text-slate-500">{kicker}</p>
          ) : null}
        </div>
        {badge}
      </header>
      <div className={cn("min-h-0 flex-1 overflow-y-auto p-3", styles.scroll, bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons, pills, badges                                              */
/* ------------------------------------------------------------------ */

export type HudButtonVariant = "primary" | "ghost" | "danger";

const BUTTON_VARIANT: Record<HudButtonVariant, string> = {
  primary:
    "border border-crew bg-crew text-void hover:brightness-110 disabled:hover:brightness-100",
  ghost:
    "border border-line bg-panel text-slate-300 hover:border-crew/50 hover:text-white",
  danger:
    "border border-alert/50 bg-alert/10 text-alert hover:bg-alert/20",
};

export function HudButton({
  variant = "ghost",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: HudButtonVariant }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crew focus-visible:ring-offset-2 focus-visible:ring-offset-void disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none",
        BUTTON_VARIANT[variant],
        className,
      )}
      {...props}
    />
  );
}

export type PillTone = "ok" | "warn" | "danger" | "info";

const PILL: Record<PillTone, { cls: string; glyph: string }> = {
  ok: { cls: "border-crew/40 bg-crew/10 text-crew", glyph: "✓" },
  warn: { cls: "border-warn/40 bg-warn/10 text-warn", glyph: "▲" },
  danger: { cls: "border-alert/45 bg-alert/10 text-alert", glyph: "✕" },
  info: { cls: "border-line bg-void/60 text-slate-400", glyph: "◆" },
};

export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: PillTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
        PILL[tone].cls,
        className,
      )}
    >
      <span aria-hidden>{PILL[tone].glyph}</span>
      {children}
    </span>
  );
}

export function PlayerBadge({
  player,
  label,
  size = "md",
}: {
  player: PlanningPlayer;
  label?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 rounded-full border border-line bg-void/60 pr-2",
        size === "sm" ? "py-0 pl-0.5" : "py-0.5 pl-0.5",
      )}
      title={`${player.name}${label ? ` — ${label}` : ""}`}
    >
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-full font-mono font-bold text-void",
          size === "sm" ? "size-4 text-[9px]" : "size-5 text-[10px]",
        )}
        style={{ backgroundColor: player.color }}
        aria-hidden
      >
        {player.name.slice(0, 1).toUpperCase()}
      </span>
      <span className="truncate font-mono text-[10px] uppercase tracking-wider text-slate-300">
        {player.name}
      </span>
      {label ? (
        <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-slate-500">
          {label}
        </span>
      ) : null}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Data display                                                        */
/* ------------------------------------------------------------------ */

export type GaugeTone = "ok" | "warn" | "danger" | "neutral";

const GAUGE_FILL: Record<GaugeTone, string> = {
  ok: "bg-crew shadow-[0_0_10px_rgba(94,234,212,0.45)]",
  warn: "bg-warn",
  danger: "bg-alert",
  neutral: "bg-slate-500",
};

export function GaugeBar({
  value,
  max,
  min = 0,
  ideal,
  tone,
  label,
  className,
}: {
  value: number;
  max: number;
  min?: number;
  ideal?: number;
  tone: GaugeTone;
  label: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn(
        "relative h-1.5 overflow-hidden rounded-full bg-void ring-1 ring-inset ring-line",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none",
          GAUGE_FILL[tone],
        )}
        style={{ width: `${pct}%` }}
      />
      {typeof ideal === "number" && max > 0 ? (
        <span
          className="absolute top-0 z-10 h-full w-px bg-white/50"
          style={{ left: `${Math.min(100, (ideal / max) * 100)}%` }}
          aria-hidden
        />
      ) : null}
      {min > 0 && max > 0 ? (
        <span
          className="absolute top-0 z-10 h-full w-px bg-warn/70"
          style={{ left: `${Math.min(100, (min / max) * 100)}%` }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}

const RISK_TONE: Record<CraftRisk, PillTone> = {
  low: "ok",
  medium: "warn",
  high: "danger",
};

export function RiskPill({ risk }: { risk: CraftRisk }) {
  return <StatusPill tone={RISK_TONE[risk]}>{risk} risk</StatusPill>;
}

export function FactCard({ fact, index }: { fact: Fact; index: number }) {
  return (
    <article className="rounded-lg border border-line/70 bg-void/40 p-2">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 font-mono text-[9px] text-crew/70">
          {String(index + 1).padStart(2, "0")}
        </span>
        <p className="text-[11px] leading-relaxed text-slate-300">{fact.text}</p>
      </div>
      <a
        href={fact.source.url}
        target="_blank"
        rel="noreferrer"
        className="mt-1 ml-6 inline-flex items-center gap-1 text-[10px] font-medium text-crew/80 underline decoration-crew/30 underline-offset-2 transition hover:text-crew focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crew"
      >
        {fact.source.title}
        <span aria-hidden>↗</span>
      </a>
    </article>
  );
}

export function ResourceSlider({
  need,
  value,
  onChange,
  disabled,
}: {
  need: ResourceNeed;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const inputId = `moon-resource-${need.key}`;
  const whyId = `${inputId}-why`;
  const status =
    value < need.min ? "below" : value < need.ideal ? "tight" : "safe";
  const tone: PillTone =
    status === "below" ? "danger" : status === "tight" ? "warn" : "ok";
  const statusLabel =
    status === "below" ? "below min" : status === "tight" ? "tight" : "safe";

  const sliderStyle = {
    "--min-pct": `${(need.min / need.max) * 100}%`,
    "--ideal-pct": `${(need.ideal / need.max) * 100}%`,
  } as CSSProperties;

  return (
    <div className="rounded-lg border border-line/60 bg-void/40 px-2.5 py-1">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={inputId}
          className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300"
        >
          {need.label}
        </label>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-xs text-white">
            {value}
            <span className="text-slate-500">
              /{need.max} {need.unit}
            </span>
          </span>
          <StatusPill tone={tone}>{statusLabel}</StatusPill>
        </div>
      </div>

      <input
        id={inputId}
        type="range"
        min={0}
        max={need.max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-describedby={whyId}
        aria-valuetext={`${value} of ${need.max} ${need.unit}. Minimum ${need.min}, ideal ${need.ideal}.`}
        className={cn(
          styles.slider,
          "mt-1 w-full focus-visible:outline-none",
          disabled && "cursor-not-allowed opacity-50",
        )}
        style={sliderStyle}
      />

      <div className="mt-0.5 flex items-start justify-between gap-3">
        <p
          id={whyId}
          title={need.why}
          className="line-clamp-1 text-[10px] leading-tight text-slate-500"
        >
          {need.why}
        </p>
        <span className="shrink-0 font-mono text-[9px] text-slate-600">
          min {need.min} · ideal {need.ideal}
        </span>
      </div>
    </div>
  );
}

export function ReadyBar({
  players,
  readyIds,
  youId,
}: {
  players: PlanningPlayer[];
  readyIds: string[];
  youId: string;
}) {
  const ready = new Set(readyIds);
  return (
    <ul className="space-y-1.5">
      {players.map((player) => {
        const isReady = ready.has(player.id);
        return (
          <li
            key={player.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-line/60 bg-void/40 px-2 py-1"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="grid size-5 shrink-0 place-items-center rounded-full font-mono text-[10px] font-bold text-void"
                style={{ backgroundColor: player.color }}
                aria-hidden
              >
                {player.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-medium text-slate-200">
                  {player.name}
                  {player.id === youId ? " (you)" : ""}
                </span>
                <span className="block font-mono text-[9px] uppercase tracking-wider text-slate-600">
                  {player.isHost ? "Commander" : player.connected ? "Crew" : "Offline"}
                </span>
              </span>
            </span>
            <StatusPill tone={!player.connected ? "info" : isReady ? "ok" : "warn"}>
              {!player.connected ? "offline" : isReady ? "locked" : "open"}
            </StatusPill>
          </li>
        );
      })}
    </ul>
  );
}
