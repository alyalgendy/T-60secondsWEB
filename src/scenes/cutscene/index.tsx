import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import type { CutsceneProps } from '../../shared/types';
import { HudButton, HudPanel, HudShell, PlayerBadge, StatusPill } from '../../shared/ui';
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

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export default function CutsceneScene({
  roomCode,
  me,
  players,
  videoSrc,
  title,
  onContinue,
}: CutsceneProps) {
  const reduceMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const host = players.find((player) => player.isHost) ?? me;
  const mission = MISSION_TITLES[clipName(videoSrc)] ?? title;

  /* Try to start playback. Browsers may reject unmuted autoplay; the overlay
     then asks for one explicit click instead. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;

    async function start(): Promise<void> {
      if (!video) return;
      try {
        video.muted = false;
        await video.play();
        if (!cancelled) setBlocked(false);
      } catch {
        if (!cancelled) {
          video.pause();
          setBlocked(true);
        }
      }
    }

    void start();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const video = videoRef.current;
      if (!video || failed) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(target.tagName)) return;

      if (event.code === 'Space') {
        event.preventDefault();
        togglePlay();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        seekBy(-5);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        seekBy(5);
      } else if (event.key.toLowerCase() === 'm') {
        event.preventDefault();
        toggleMute();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed]);

  const togglePlay = useCallback((): void => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (video.ended) video.currentTime = 0;
      void video.play().catch(() => setBlocked(true));
    } else {
      video.pause();
    }
  }, []);

  const toggleMute = useCallback((): void => {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    setMuted(next);
  }, []);

  const seekBy = useCallback((delta: number): void => {
    const video = videoRef.current;
    if (!video) return;
    const max = Number.isFinite(video.duration) ? video.duration : 0;
    video.currentTime = Math.max(0, Math.min(max, video.currentTime + delta));
  }, []);

  function beginPlayback(): void {
    const video = videoRef.current;
    if (!video) return;
    setBlocked(false);
    video.muted = false;
    setMuted(false);
    void video.play().catch(() => setBlocked(true));
  }

  async function handleContinue(): Promise<void> {
    if (busy) return;
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

  async function requestFullscreen(): Promise<void> {
    try {
      await wrapRef.current?.requestFullscreen();
    } catch {
      /* Fullscreen may be unavailable; playback is unaffected. */
    }
  }

  const progress = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

  return (
    <HudShell
      missionTitle={mission}
      stepLabel="Transmission"
      roomCode={roomCode}
      players={players}
      me={me}
      headerAside={
        ended ? (
          <StatusPill tone="ok">Transmission complete</StatusPill>
        ) : failed ? (
          <StatusPill tone="danger">No signal</StatusPill>
        ) : (
          <StatusPill tone={playing ? 'info' : 'neutral'}>
            {playing ? 'Playing' : 'Standby'}
          </StatusPill>
        )
      }
    >
      <HudPanel
        title={title}
        subtitle={failed ? 'Video feed unavailable' : 'Mission transmission'}
        className={styles.stage}
        bodyClassName={styles.stageBody}
        aside={
          <span className={styles.clipRef}>
            {videoSrc.split('/').pop() ?? videoSrc}
          </span>
        }
      >
        <div className={styles.player} ref={wrapRef}>
          {!failed ? (
            <video
              ref={videoRef}
              className={styles.video}
              src={videoSrc}
              preload="metadata"
              playsInline
              aria-label={`${title} cutscene video`}
              onPlay={() => {
                setPlaying(true);
                setBlocked(false);
                setEnded(false);
              }}
              onPause={() => setPlaying(false)}
              onTimeUpdate={(event) => {
                const video = event.currentTarget;
                setCurrent(video.currentTime);
                if (video.currentTime < (video.duration || 0) - 0.3) {
                  setEnded(false);
                }
              }}
              onLoadedMetadata={(event) => {
                setDuration(event.currentTarget.duration);
                setCurrent(event.currentTarget.currentTime);
              }}
              onEnded={() => {
                setEnded(true);
                setPlaying(false);
              }}
              onError={() => {
                setFailed(true);
                setPlaying(false);
                setBlocked(false);
              }}
            />
          ) : (
            <div className={styles.signalLost}>
              <span className={styles.signalGlyph} aria-hidden="true">
                ⌀
              </span>
              <h1 className={styles.signalTitle}>Signal lost</h1>
              <p className={styles.signalText}>
                This transmission could not be loaded (<code>{videoSrc}</code>).
                The mission can still continue.
              </p>
            </div>
          )}

          {blocked && !ended && !failed ? (
            <div className={styles.autoplayOverlay}>
              <span className={styles.eyebrow}>Transmission ready</span>
              <h1 className={styles.autoplayTitle}>{title}</h1>
              <p className={styles.autoplayText}>
                Your browser paused playback with sound. Press play to begin the
                cutscene.
              </p>
              <HudButton variant="primary" onClick={beginPlayback}>
                ▶ Play cutscene
              </HudButton>
              <p className={styles.autoplayHint}>
                Space play/pause · ← → seek · M mute
              </p>
            </div>
          ) : null}

          {ended ? (
            <motion.div
              className={styles.endedOverlay}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
            >
              <span className={styles.eyebrow}>End of transmission</span>
              <p className={styles.endedTitle}>{title}</p>
              {me.isHost ? (
                <HudButton
                  variant="primary"
                  onClick={() => {
                    void handleContinue();
                  }}
                  disabled={busy}
                >
                  {busy ? 'Saving…' : 'Continue'}
                </HudButton>
              ) : (
                <p className={styles.waitNote} aria-live="polite">
                  Waiting for {host.name} to continue.
                </p>
              )}
            </motion.div>
          ) : null}

          {!failed ? (
            <div className={styles.controls}>
              <button
                type="button"
                className={styles.controlButton}
                onClick={togglePlay}
                aria-label={playing ? 'Pause cutscene' : 'Play cutscene'}
              >
                <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
              </button>
              <button
                type="button"
                className={styles.controlButton}
                onClick={() => seekBy(-10)}
                aria-label="Rewind 10 seconds"
              >
                <span aria-hidden="true">−10</span>
              </button>
              <button
                type="button"
                className={styles.controlButton}
                onClick={() => seekBy(10)}
                aria-label="Forward 10 seconds"
              >
                <span aria-hidden="true">+10</span>
              </button>
              <span className={styles.time}>
                {formatTime(current)} / {formatTime(duration)}
              </span>
              <div className={styles.progressTrack} aria-hidden="true">
                <span className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
              <button
                type="button"
                className={clsx(styles.controlButton, styles.wide)}
                onClick={toggleMute}
                aria-label={muted ? 'Unmute cutscene' : 'Mute cutscene'}
                aria-pressed={muted}
              >
                <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
                <span className={styles.controlText}>{muted ? 'Muted' : 'Sound'}</span>
              </button>
              <button
                type="button"
                className={clsx(styles.controlButton, styles.wide, styles.fullscreen)}
                onClick={() => {
                  void requestFullscreen();
                }}
                aria-label="Toggle fullscreen"
              >
                <span aria-hidden="true">⛶</span>
                <span className={styles.controlText}>Full</span>
              </button>
            </div>
          ) : null}
        </div>

        <div className={styles.meta}>
          <div className={styles.metaText}>
            <span className={styles.metaLabel}>Transmission</span>
            <p className={styles.metaTitle}>{title}</p>
            <p className={styles.metaHint}>
              {failed
                ? 'The crew can continue without this clip.'
                : 'Playback is shared as a recording. Every player watches the same cutscene.'}
            </p>
          </div>

          <div className={styles.metaActions}>
            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}
            {me.isHost ? (
              failed ? (
                <HudButton
                  variant="primary"
                  onClick={() => {
                    void handleContinue();
                  }}
                  disabled={busy}
                >
                  {busy ? 'Saving…' : 'Continue without video'}
                </HudButton>
              ) : (
                <HudButton
                  variant="ghost"
                  onClick={() => {
                    void handleContinue();
                  }}
                  disabled={busy}
                >
                  {busy ? 'Saving…' : ended ? 'Skip to next step' : 'Skip cutscene'}
                </HudButton>
              )
            ) : (
              <p className={styles.hostHint}>
                <PlayerBadge player={host} size="sm" showName /> controls this step.
              </p>
            )}
          </div>
        </div>
      </HudPanel>
    </HudShell>
  );
}
