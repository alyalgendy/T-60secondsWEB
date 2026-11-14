import { useCallback, useEffect, useState } from 'react';
import { ref, runTransaction, update } from 'firebase/database';
import { requireDb } from '../firebase';
import { getErrorMessage } from '../constants';
import { createInitialDraft } from '../scoring';
import { subscribeDraft } from '../roomService';
import type {
  MissionConfig,
  MissionId,
  MissionPlan,
  PlanDraft,
  Player,
} from '../types';

export interface UsePlanningArgs {
  roomCode: string;
  me: Player;
  missionId: MissionId;
  config: MissionConfig;
}

export interface UsePlanningResult {
  draft: PlanDraft | null;
  error: string | null;
  updateDraft: (
    patch: Partial<Pick<PlanDraft, 'craftId' | 'resources'>>,
  ) => Promise<void>;
  toggleReady: () => Promise<void>;
  launch: (plan: MissionPlan) => Promise<void>;
}

/**
 * Owns the live, co-edited draft for one mission. Every player writes to the
 * same PlanDraft; lastEditedBy drives the "someone else just changed this" badge.
 */
export function usePlanning({
  roomCode,
  me,
  missionId,
  config,
}: UsePlanningArgs): UsePlanningResult {
  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const draftPath = `rooms/${roomCode}/drafts/${missionId}`;

  useEffect(() => {
    const database = requireDb();
    const draftRef = ref(database, draftPath);
    let cancelled = false;
    let initialized = false;

    const ensureDraft = () => {
      if (initialized) return;
      initialized = true;
      runTransaction(draftRef, (currentData) => {
        const current = currentData as PlanDraft | null;
        if (current) return current;
        return createInitialDraft(config);
      }).catch((transactionError: unknown) => {
        if (!cancelled) setError(getErrorMessage(transactionError));
      });
    };

    const unsubscribe = subscribeDraft(
      roomCode,
      missionId,
      (nextDraft) => {
        if (cancelled) return;
        setDraft(nextDraft);
        if (!nextDraft) ensureDraft();
      },
      (message) => {
        if (!cancelled) setError(message);
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [roomCode, missionId, config, draftPath]);

  const updateDraft = useCallback(
    async (patch: Partial<Pick<PlanDraft, 'craftId' | 'resources'>>) => {
      const database = requireDb();
      const updates: Record<string, unknown> = {
        lastEditedBy: me.id,
        updatedAt: Date.now(),
      };
      if (patch.craftId !== undefined) updates.craftId = patch.craftId;
      if (patch.resources !== undefined) updates.resources = patch.resources;

      try {
        await update(ref(database, draftPath), updates);
      } catch (writeError: unknown) {
        setError(getErrorMessage(writeError));
        throw writeError;
      }
    },
    [draftPath, me.id],
  );

  const toggleReady = useCallback(async () => {
    const database = requireDb();
    const draftRef = ref(database, draftPath);
    try {
      await runTransaction(draftRef, (currentData) => {
        const current = currentData as PlanDraft | null;
        const base = current ?? createInitialDraft(config);
        // Firebase Realtime Database drops empty arrays, so an untouched draft
        // comes back without readyPlayerIds. Never call .includes on undefined.
        const readyPlayerIds = Array.isArray(base.readyPlayerIds)
          ? base.readyPlayerIds
          : [];
        const isReady = readyPlayerIds.includes(me.id);
        return {
          ...base,
          readyPlayerIds: isReady
            ? readyPlayerIds.filter((id) => id !== me.id)
            : [...readyPlayerIds, me.id],
          updatedAt: Date.now(),
        };
      });
    } catch (readyError: unknown) {
      setError(getErrorMessage(readyError));
      throw readyError;
    }
  }, [config, draftPath, me.id]);

  const launch = useCallback(
    async (plan: MissionPlan) => {
      if (!me.isHost) throw new Error('Only the host can launch the mission.');
      const database = requireDb();
      try {
        await update(ref(database), {
          [`rooms/${roomCode}/plans/${missionId}`]: plan,
          [`rooms/${roomCode}/meta/status`]: 'playing',
          [`rooms/${roomCode}/flow`]: {
            step: `decision-${missionId}`,
            updatedAt: Date.now(),
          },
        });
      } catch (launchError: unknown) {
        setError(getErrorMessage(launchError));
        throw launchError;
      }
    },
    [me.isHost, missionId, roomCode],
  );

  return { draft, error, updateDraft, toggleReady, launch };
}
