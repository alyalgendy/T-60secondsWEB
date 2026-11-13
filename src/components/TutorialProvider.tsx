"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import type { StaticAnchorId } from "@/lib/anchors";
import {
  readSeenSteps,
  resetSeenSteps,
  stepsForPhase,
  TUTORIAL_STEPS,
  writeSeenSteps,
  type TutorialPhase,
} from "@/lib/tutorial";

interface TutorialContextValue {
  activeAnchor: StaticAnchorId | null;
  replay: () => void;
}

const TutorialContext = createContext<TutorialContextValue>({
  activeAnchor: null,
  replay: () => {},
});

/** Components ask "am I the thing the tutorial is pointing at?" */
export function useTutorialAnchor(anchor: StaticAnchorId): boolean {
  return useContext(TutorialContext).activeAnchor === anchor;
}

export function TutorialProvider({
  phase,
  children,
}: {
  phase: TutorialPhase;
  children: ReactNode;
}) {
  const [seen, setSeen] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tutorial") === "reset") {
      resetSeenSteps();
    }
    setSeen(readSeenSteps());
    setMounted(true);
  }, []);

  const phaseSteps = useMemo(() => TUTORIAL_STEPS.filter((step) => step.phase === phase), [phase]);
  const remaining = useMemo(() => stepsForPhase(phase, seen), [phase, seen]);
  const current = mounted ? remaining[0] : undefined;
  const index = phaseSteps.length - remaining.length;

  const persist = useCallback((next: string[]) => {
    setSeen(next);
    writeSeenSteps(next);
  }, []);

  const advance = useCallback(() => {
    if (!current) return;
    persist([...seen, current.id]);
  }, [current, persist, seen]);

  const skip = useCallback(() => {
    persist([...seen, ...remaining.map((step) => step.id)]);
  }, [persist, remaining, seen]);

  const replay = useCallback(() => {
    const prefix = `${phase}-`;
    persist(seen.filter((id) => !id.startsWith(prefix)));
  }, [persist, phase, seen]);

  const value = useMemo(
    () => ({ activeAnchor: current?.anchor ?? null, replay }),
    [current?.anchor, replay],
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}

      {current ? (
        <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50">
          <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-crew/30 bg-panel/95 p-4 shadow-[0_20px_60px_-20px_rgba(94,234,212,0.55)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-crew">
                Briefing · {index + 1}/{phaseSteps.length}
              </span>
              <span className="flex gap-1" aria-hidden>
                {phaseSteps.map((step, dotIndex) => (
                  <span
                    key={step.id}
                    className={cn(
                      "size-1.5 rounded-full",
                      dotIndex <= index ? "bg-crew" : "bg-line",
                    )}
                  />
                ))}
              </span>
            </div>
            <h3 className="mt-2 text-base font-semibold text-white">{current.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">{current.body}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={skip}
                className="text-xs font-medium text-slate-500 transition hover:text-slate-300"
              >
                Skip briefing
              </button>
              <button
                type="button"
                onClick={advance}
                className="rounded-lg bg-crew px-3 py-1.5 text-xs font-semibold text-void transition hover:brightness-110"
              >
                {index + 1 === phaseSteps.length ? "Got it" : "Next"}
              </button>
            </div>
          </div>
        </div>
      ) : mounted && phaseSteps.length > 0 ? (
        <button
          type="button"
          onClick={replay}
          title="Replay briefing"
          aria-label="Replay briefing"
          className="fixed bottom-4 right-4 z-40 grid size-9 place-items-center rounded-full border border-line bg-panel/90 font-mono text-sm text-slate-400 backdrop-blur transition hover:border-crew/50 hover:text-crew"
        >
          ?
        </button>
      ) : null}
    </TutorialContext.Provider>
  );
}
