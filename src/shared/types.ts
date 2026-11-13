export type MissionId = 'iss' | 'moon' | 'mars';

export type ResourceKey =
  | 'fuel'
  | 'power'
  | 'oxygen'
  | 'water'
  | 'food'
  | 'shielding'
  | 'spares';

export type FlowStep =
  | 'lobby'
  | 'cutscene-intro'
  | 'cutscene-intro-to-iss'
  | 'cutscene-iss'
  | 'plan-iss'
  | 'decision-iss'
  | 'cutscene-iss-to-moon'
  | 'cutscene-moon'
  | 'plan-moon'
  | 'decision-moon'
  | 'cutscene-moon-to-mars'
  | 'cutscene-mars'
  | 'plan-mars'
  | 'decision-mars'
  | 'results';

export interface Player {
  id: string;
  name: string;
  color: string; // one of PLAYER_COLORS
  joinOrder: number; // 0-3, used for turn order
  isHost: boolean;
  connected: boolean;
}

export interface Source {
  title: string;
  url: string;
}

export interface Fact {
  text: string;
  source: Source;
}

export interface ResourceNeed {
  key: ResourceKey;
  label: string;
  unit: string; // e.g. "units"
  min: number; // below this the mission fails
  ideal: number; // at/above this is safe
  max: number; // slider max
  massPerUnit: number; // game mass cost per unit
  why: string; // one-line "why it matters"
}

export interface CraftOption {
  id: string;
  name: string;
  description: string;
  massCapacity: number; // game units
  crewCapacity: number;
  pros: string[];
  cons: string[];
  source?: Source;
}

export interface MissionConfig {
  id: MissionId;
  title: string;
  destination: string;
  goal: string; // one sentence
  durationDays: number;
  massBudget: number; // used if a mission has no craft step
  needs: ResourceNeed[]; // one per ResourceKey used in this mission
  crafts: CraftOption[]; // length 1 = auto-selected, hide chooser
  facts: Fact[]; // 2-3 items
}

export interface PlanDraft {
  craftId: string | null;
  resources: Record<ResourceKey, number>;
  readyPlayerIds: string[];
  lastEditedBy: string | null;
  updatedAt: number;
}

export interface MissionPlan {
  missionId: MissionId;
  craftId: string | null;
  resources: Record<ResourceKey, number>;
  massUsed: number;
  massBudget: number;
  score: number; // 0-100 from scorePlan()
  lockedAt: number;
}

export interface DecisionOption {
  id: string;
  label: string;
  reasoning: string; // shown before choosing: pros/cons hint
  effects: Partial<Record<ResourceKey, number>>; // negative = lose units
  scoreDelta: number; // -20..+20
  outcome: string; // shown after choosing
}

export interface DecisionProblem {
  id: string;
  missionId: MissionId;
  title: string;
  briefing: string; // what is happening, 2-4 sentences
  options: DecisionOption[]; // 3 options
  realWorld: { summary: string; source: Source };
}

export interface DecisionState {
  missionId: MissionId;
  problemIds: string[];
  index: number;
  turnPlayerId: string;
  picks: { problemId: string; playerId: string; optionId: string }[];
  resourcesAfter: Record<ResourceKey, number>;
  scoreAfter: number;
  status: 'choosing' | 'revealed' | 'debrief';
}

/* ---------- Scene props ---------- */

export interface BaseSceneProps {
  roomCode: string;
  me: Player;
  players: Player[]; // 1-4, sorted by joinOrder
}

export interface PlanningSceneProps extends BaseSceneProps {
  missionId: MissionId;
  draft: PlanDraft;
  updateDraft: (
    patch: Partial<Pick<PlanDraft, 'craftId' | 'resources'>>,
  ) => Promise<void>;
  toggleReady: () => Promise<void>;
  launch: (plan: MissionPlan) => Promise<void>; // host only
}

export interface CutsceneProps extends BaseSceneProps {
  videoSrc: string; // e.g. /videos/iss.mp4
  title: string;
  onContinue: () => Promise<void>; // host only
}

export interface DecisionSceneProps extends BaseSceneProps {
  missionId: MissionId;
  plan: MissionPlan;
  state: DecisionState;
  choose: (optionId: string) => Promise<void>; // only the turn player
  nextProblem: () => Promise<void>; // host only
  finish: () => Promise<void>; // host only
}

/* ---------- Shared helpers (implemented by M1 in scoring.ts) ---------- */

export interface PlanScore {
  score: number;
  massUsed: number;
  massBudget: number;
  problems: string[];
}

/* ---------- Extra shared shapes used by M1's plumbing ---------- */

export interface RoomMeta {
  createdAt: number;
  hostId: string;
  status: 'lobby' | 'playing' | 'finished';
}

export interface FlowState {
  step: FlowStep;
  updatedAt: number;
}

export interface ResultsSceneProps extends BaseSceneProps {
  plans: Partial<Record<MissionId, MissionPlan>>;
  decisions: Partial<Record<MissionId, DecisionState>>;
  missionScores: Record<MissionId, number | null>;
  totalScore: number;
}

export interface MissionResults {
  plans: Partial<Record<MissionId, MissionPlan>>;
  decisions: Partial<Record<MissionId, DecisionState>>;
  missionScores: Record<MissionId, number | null>;
  totalScore: number;
}
