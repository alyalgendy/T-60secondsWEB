import type { ResourceKey, SystemId } from '../../shared/types';

export const WARNING_LEVELS = [
  'advisory',
  'caution',
  'warning',
  'critical',
] as const;

export type WarningLevel = (typeof WARNING_LEVELS)[number];

export const WINDOW_EFFECTS = [
  'flare',
  'micrometeoroid',
  'static',
  'thermal',
  'engine',
  'powerdip',
] as const;

export type WindowEffect = (typeof WINDOW_EFFECTS)[number];

export interface WarningInput {
  id?: string;
  level: WarningLevel;
  system: SystemId;
  effect: WindowEffect;
  countdownSeconds?: number;
}

export interface CapsuleWarning {
  id: string;
  level: WarningLevel;
  system: SystemId;
  effect: WindowEffect;
  issuedAt: number;
  deadlineAt?: number;
}

export interface ResourceGaugeValue {
  value: number;
  maximum: number;
}

export type CapsuleResources = Partial<
  Record<ResourceKey, ResourceGaugeValue>
>;
