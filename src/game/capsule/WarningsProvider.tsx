import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { CapsuleWarning, WarningInput } from './types';
import { selectPrimaryWarning } from './warnings';

interface WarningsContextValue {
  warnings: CapsuleWarning[];
  activeWarning: CapsuleWarning | null;
  muted: boolean;
  raiseWarning: (warning: WarningInput) => void;
  dismissWarning: (id: string) => void;
  clearWarnings: () => void;
  toggleMute: () => void;
}

const WarningsContext = createContext<WarningsContextValue | null>(null);

const WARNING_TONES = {
  advisory: { frequency: 660, volume: 0.012, pulses: 1 },
  caution: { frequency: 560, volume: 0.018, pulses: 1 },
  warning: { frequency: 430, volume: 0.026, pulses: 2 },
  critical: { frequency: 320, volume: 0.036, pulses: 3 },
} as const;

export function WarningsProvider({ children }: { children: ReactNode }) {
  const [warnings, setWarnings] = useState<CapsuleWarning[]>([]);
  const [muted, setMuted] = useState(false);
  const nextId = useRef(0);
  const mutedRef = useRef(false);
  const audioContext = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined' || !window.AudioContext) return null;
    if (!audioContext.current || audioContext.current.state === 'closed') {
      audioContext.current = new window.AudioContext();
      const tone = audioContext.current.createOscillator();
      const volume = audioContext.current.createGain();
      tone.type = 'sine';
      tone.frequency.value = 54;
      volume.gain.value = 0.004;
      tone.connect(volume);
      volume.connect(audioContext.current.destination);
      tone.start();
    }
    return audioContext.current;
  }, []);

  const playWarningSound = useCallback(
    (level: WarningInput['level']) => {
      if (mutedRef.current) return;
      const context = getAudioContext();
      if (!context) return;
      if (context.state === 'suspended') {
        void context.resume().catch((error: unknown) => {
          console.warn('Capsule audio could not resume.', error);
        });
      }

      const sound = WARNING_TONES[level];
      const startAt = context.currentTime;
      for (let pulse = 0; pulse < sound.pulses; pulse += 1) {
        const oscillator = context.createOscillator();
        const volume = context.createGain();
        const startsAt = startAt + pulse * 0.17;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(sound.frequency, startsAt);
        volume.gain.setValueAtTime(0.0001, startsAt);
        volume.gain.exponentialRampToValueAtTime(sound.volume, startsAt + 0.02);
        volume.gain.exponentialRampToValueAtTime(0.0001, startsAt + 0.13);
        oscillator.connect(volume);
        volume.connect(context.destination);
        oscillator.start(startsAt);
        oscillator.stop(startsAt + 0.14);
      }
    },
    [getAudioContext],
  );

  useEffect(
    () => () => {
      const context = audioContext.current;
      audioContext.current = null;
      if (context && context.state !== 'closed') {
        void context.close().catch((error: unknown) => {
          console.warn('Capsule audio could not close.', error);
        });
      }
    },
    [],
  );

  const raiseWarning = useCallback(
    (input: WarningInput) => {
      const issuedAt = Date.now();
      const warning: CapsuleWarning = {
        id: input.id ?? `capsule-warning-${++nextId.current}`,
        level: input.level,
        system: input.system,
        effect: input.effect,
        issuedAt,
        ...(input.countdownSeconds !== undefined &&
        Number.isFinite(input.countdownSeconds) &&
        input.countdownSeconds > 0
          ? { deadlineAt: issuedAt + input.countdownSeconds * 1000 }
          : {}),
      };
      setWarnings((current) => [
        ...current.filter((item) => item.id !== warning.id),
        warning,
      ]);
      playWarningSound(warning.level);
    },
    [playWarningSound],
  );

  const dismissWarning = useCallback((id: string) => {
    setWarnings((current) => current.filter((warning) => warning.id !== id));
  }, []);

  const clearWarnings = useCallback(() => setWarnings([]), []);

  const toggleMute = useCallback(() => {
    const next = !muted;
    mutedRef.current = next;
    setMuted(next);
    const context = audioContext.current;
    if (next && context) {
      void context.suspend().catch((error: unknown) => {
        console.warn('Capsule audio could not mute.', error);
      });
    } else if (!next) {
      const resumedContext = getAudioContext();
      if (resumedContext) {
        void resumedContext.resume().catch((error: unknown) => {
          console.warn('Capsule audio could not resume.', error);
        });
      }
    }
  }, [getAudioContext, muted]);

  const value = useMemo<WarningsContextValue>(
    () => ({
      warnings,
      activeWarning: selectPrimaryWarning(warnings),
      muted,
      raiseWarning,
      dismissWarning,
      clearWarnings,
      toggleMute,
    }),
    [clearWarnings, dismissWarning, muted, raiseWarning, toggleMute, warnings],
  );

  return (
    <WarningsContext.Provider value={value}>
      {children}
    </WarningsContext.Provider>
  );
}

export function useWarnings(): WarningsContextValue {
  const context = useContext(WarningsContext);
  if (!context) {
    throw new Error('useWarnings must be used inside a CapsuleShell.');
  }
  return context;
}
