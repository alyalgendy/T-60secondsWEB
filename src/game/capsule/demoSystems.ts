import type { SystemId } from '../../shared/types';
import type { WindowEffect } from './types';

export const SYSTEMS: Record<WindowEffect, SystemId> = {
  flare: 'solar',
  micrometeoroid: 'shield',
  static: 'comms',
  thermal: 'thermal',
  engine: 'engine',
  powerdip: 'solar',
};
