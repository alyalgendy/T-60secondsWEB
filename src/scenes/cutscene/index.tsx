import { useEffect, useRef, useState } from 'react';
import type { CutsceneProps } from '../../shared/types';
import styles from './CutsceneScene.module.css';

const MISSION_TITLES: Record<string, string> = {
  intro: 'Mission Briefing',
  iss: 'Mission 1 · ISS',
  moon: 'Mission 2 · Moon',
  mars: 'Mission 3 · Mars',
};

function clipName(videoSrc: string): string {
  const file = videoSrc.split('/').pop() ?? videoSrc;
  return file.replace(/\.[a-z0-9]+$/i, '');
}

export default function CutsceneScene({
  videoSrc,
  title,
  me,
  players,
  onContinue,
}: CutsceneProps) {
  const rootRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [playAttempted, setPlayAttempted] = useState(false);
  const [cinematicReady, setCinematicReady] = useState(false);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const host = players.find((player) => player.isHost) ?? me;
  const mission = MISSION_TITLES[clipName(videoSrc)] ?? title;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;

    void video.play().catch(() => {
      if (!cancelled) setPlayAttempted(false);
    });

    return () => {
      cancelled = true;
      video.pause();
    };
  }, []);

  function prepareCinematicPlayback(): void {
    setCinematicReady(true);

    const root = rootRef.current;
    if (root && !document.fullscreenElement && root.requestFullscreen) {
      try {
        void root.requestFullscreen().catch(() => {
          // Keep the viewport-filling fallback if fullscreen is unavailable.
        });
      } catch {
        // Keep the viewport-filling fallback if fullscreen is unavailable.
      }
    }

    const video = videoRef.current;
    if (!started && !playAttempted && !failed && !ended && video) {
      setPlayAttempted(true);
      void video.play().catch(() => setPlayAttempted(true));
    }
  }

  async function handleContinue(): Promise<void> {
    if (busy || !me.isHost) return;
    setBusy(true);
    setError(null);
    try {
      await onContinue();
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message
          ? caught.message
          : 'Could not advance the mission. Check your connection and try again.',
      );
      setBusy(false);
    }
  }

  function handleForward(): void {
    if (!cinematicReady && !ended && !failed) {
      prepareCinematicPlayback();
      return;
    }

    if (failed || ended) {
      void handleContinue();
      return;
    }

    const video = videoRef.current;
    if (!started && !playAttempted && !failed && video) {
      setPlayAttempted(true);
      void video.play().catch(() => setPlayAttempted(true));
      return;
    }

    void handleContinue();
  }

  const waitingForPlayback = !started && !ended && !failed;
  const actionLabel = ended || failed
    ? 'Continue to next mission step'
    : !cinematicReady
      ? 'Enter fullscreen and play transmission'
      : waitingForPlayback && !playAttempted
        ? 'Start transmission'
        : 'Forward to next mission step';

  return (
    <main className={styles.cinematic} ref={rootRef}>
      {!failed ? (
        <video
          ref={videoRef}
          className={styles.video}
          src={videoSrc}
          preload="metadata"
          playsInline
          aria-label={`${title} cutscene video`}
          onPlay={() => setStarted(true)}
          onPause={() => setStarted(false)}
          onEnded={() => {
            setEnded(true);
            setStarted(false);
          }}
          onError={() => {
            setFailed(true);
            setStarted(false);
          }}
        />
      ) : (
        <div className={styles.signalLost} role="status">
          <span className={styles.signalGlyph} aria-hidden="true">⌁</span>
          <p>Transmission unavailable · the crew can continue</p>
        </div>
      )}

      <header className={styles.headline}>
        <span className={styles.brand}>T -60 seconds</span>
        <span className={styles.separator} aria-hidden="true" />
        <span>{mission}</span>
        <span className={styles.title}>{title}</span>
      </header>

      {waitingForPlayback ? (
        <p className={styles.playbackHint} aria-live="polite">
          {playAttempted
            ? 'Playback is blocked by the browser. Forward to continue without the clip.'
            : 'Transmission ready'}
        </p>
      ) : null}

      {!me.isHost ? (
        <p className={styles.waiting} aria-live="polite">
          {host.name} controls the mission. Your view advances with the crew.
        </p>
      ) : null}

      {error ? <p className={styles.error} role="alert">{error}</p> : null}

      <button
        className={styles.forward}
        type="button"
        onClick={handleForward}
        disabled={busy || (!me.isHost && (cinematicReady || failed || ended))}
        aria-label={actionLabel}
      >
        <span>
          {busy
            ? 'Advancing…'
            : ended || failed
              ? 'Continue'
              : !cinematicReady && waitingForPlayback
                ? 'Start'
                : 'Forward'}
        </span>
        <span className={styles.arrow} aria-hidden="true">→</span>
      </button>
    </main>
  );
}
