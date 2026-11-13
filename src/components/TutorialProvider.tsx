import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import type { StaticAnchorId } from '../lib/anchors';
import type { TutorialPhase } from '../lib/tutorial';

interface TutorialContextValue {
  phase: TutorialPhase;
  activeAnchor: StaticAnchorId | null;
}

const TutorialContext = createContext<TutorialContextValue>({
  phase: 'landing',
  activeAnchor: null,
});

export function TutorialProvider({
  phase,
  children,
}: {
  phase: TutorialPhase;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ phase, activeAnchor: null as StaticAnchorId | null }),
    [phase],
  );

  return (
    <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>
  );
}

export function useTutorialAnchor(anchor: StaticAnchorId): boolean {
  const { activeAnchor } = useContext(TutorialContext);
  return activeAnchor === anchor;
}
