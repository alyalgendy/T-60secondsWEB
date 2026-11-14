import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { MarkerSlot } from '../../components/MarkerBadge';
import { ISS_LAUNCH_WINDOWS } from '../../content/iss-v2';
import {
  MISSION_TRAJECTORIES,
  SOLAR_SYSTEM_ORBITS,
  TRAJECTORY_BODIES,
  TRAJECTORY_NOTE,
  type TrajectoryPoint,
} from '../../content/trajectories';
import { MISSION_SECONDS } from '../../shared/sim';
import type { MissionEvent, MissionId } from '../../shared/types';
import type { Marker } from '../../lib/markers';
import { TUTORIAL_STEPS } from '../../lib/tutorial';
import styles from './MissionVizTracker.module.css';

type TrackerMode = 'compact' | 'picker' | 'replay';

interface MissionVizTrackerProps {
  missionId: MissionId;
  mode: TrackerMode;
  progress: number;
  missionDays: number;
  events?: readonly MissionEvent[];
  startedAt?: number;
  selectedWindowId?: string | null;
  markers?: Marker[];
  showTutorial?: boolean;
  onSelectWindow?: (windowId: string) => void;
  onClose?: () => void;
}

interface RenderScene {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  craft: THREE.Mesh;
  points: THREE.Vector3[];
  canvas: HTMLCanvasElement;
}

function clampProgress(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function toVector(point: TrajectoryPoint): THREE.Vector3 {
  return new THREE.Vector3(point[0], point[1], point[2]);
}

function pointAtProgress(points: readonly THREE.Vector3[], progress: number): THREE.Vector3 {
  if (points.length < 2) return points[0]?.clone() ?? new THREE.Vector3();
  const scaled = clampProgress(progress) * (points.length - 1);
  const start = Math.floor(scaled);
  const fraction = scaled - start;
  return points[start]!.clone().lerp(points[Math.min(start + 1, points.length - 1)]!, fraction);
}

function orbitPoints(radius: number, x = 0, y = 0): THREE.Vector3[] {
  return Array.from({ length: 97 }, (_, index) => {
    const angle = (index / 96) * Math.PI * 2;
    return new THREE.Vector3(
      x + Math.cos(angle) * radius,
      y + Math.sin(angle) * radius,
      0,
    );
  });
}

function addLine(
  scene: THREE.Scene,
  points: readonly THREE.Vector3[],
  color: number,
  opacity: number,
): void {
  const geometry = new THREE.BufferGeometry().setFromPoints([...points]);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
  });
  scene.add(new THREE.Line(geometry, material));
}

function OrbitScene({
  missionId,
  progress,
}: {
  missionId: MissionId;
  progress: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<RenderScene | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
      });
    } catch {
      setUnavailable(true);
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 11.8);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x020914, 0);

    for (const orbit of SOLAR_SYSTEM_ORBITS) {
      addLine(scene, orbitPoints(orbit.radius), orbit.color, 0.35);
    }
    addLine(scene, orbitPoints(0.64, 2, 0), 0x9caec0, 0.4);
    addLine(
      scene,
      MISSION_TRAJECTORIES[missionId].points.map(toVector),
      0x62dfff,
      0.78,
    );

    for (const body of Object.values(TRAJECTORY_BODIES)) {
      const geometry = new THREE.SphereGeometry(body.radius, 20, 16);
      const material = new THREE.MeshBasicMaterial({ color: body.color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(toVector(body.position));
      scene.add(mesh);
    }

    const craft = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.115, 0),
      new THREE.MeshBasicMaterial({ color: 0x83f3ff }),
    );
    scene.add(craft);

    const trajectoryPoints = MISSION_TRAJECTORIES[missionId].points.map(toVector);
    sceneRef.current = {
      renderer,
      scene,
      camera,
      craft,
      points: trajectoryPoints,
      canvas,
    };

    const render = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const resizeObserver = new ResizeObserver(render);
    resizeObserver.observe(canvas);
    render();

    return () => {
      resizeObserver.disconnect();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      sceneRef.current = null;
    };
  }, [missionId]);

  useEffect(() => {
    const renderScene = sceneRef.current;
    if (!renderScene) return;
    renderScene.craft.position.copy(
      pointAtProgress(renderScene.points, progress),
    );
    renderScene.renderer.render(renderScene.scene, renderScene.camera);
  }, [progress]);

  return (
    <div className={styles.orbitView}>
      <canvas
        ref={canvasRef}
        className={styles.orbitCanvas}
        role="img"
        aria-label={`${MISSION_TRAJECTORIES[missionId].label} trajectory with Sun, Earth, Moon, Mars, and spacecraft`}
      />
      {unavailable && <span className={styles.canvasFallback}>3D preview unavailable</span>}
      <div className={styles.bodyLabels} aria-hidden="true">
        <span>Sun</span>
        <span>Earth</span>
        <span>Moon</span>
        <span>Mars</span>
      </div>
    </div>
  );
}

function eventProgress(event: MissionEvent, startedAt: number): number {
  return clampProgress(
    (event.startsAt - startedAt) / (MISSION_SECONDS * 1000),
  );
}

export default function MissionVizTracker({
  missionId,
  mode,
  progress,
  missionDays,
  events = [],
  startedAt = 0,
  selectedWindowId,
  markers = [],
  showTutorial = true,
  onSelectWindow,
  onClose,
}: MissionVizTrackerProps) {
  const [replayProgress, setReplayProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const displayProgress =
    mode === 'replay' ? replayProgress : clampProgress(progress);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener('change', updatePreference);
    return () => preference.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    if (mode === 'replay') {
      setReplayProgress(0);
      setPlaying(false);
      setSelectedEventId(null);
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== 'replay' || !playing) return;
    const target = clampProgress(progress);
    if (reducedMotion) {
      setReplayProgress(target);
      setPlaying(false);
      return;
    }
    const started = performance.now();
    let animationFrame = 0;
    const animate = (now: number) => {
      const next = Math.min(1, (now - started) / 8000);
      setReplayProgress(target * next);
      if (next >= 1) setPlaying(false);
      else animationFrame = window.requestAnimationFrame(animate);
    };
    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [mode, playing, progress, reducedMotion]);

  useEffect(() => {
    if (mode === 'compact') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, onClose]);

  const selectedEvent = events.find((event) => event.id === selectedEventId);
  const picker = mode === 'picker';
  const replay = mode === 'replay';
  const overlayAnchor = picker ? 'design-window-picker' : 'mission-replay';
  const tutorial = TUTORIAL_STEPS.find(
    (step) => step.id === (picker ? 'design-window-viz' : 'mission-replay'),
  );
  const shellClass = picker
    ? styles.picker
    : replay
      ? styles.replay
      : styles.compact;
  const shellRole = mode === 'compact' ? undefined : 'dialog';
  const activeWindow = ISS_LAUNCH_WINDOWS.find(
    (window) => window.id === selectedWindowId,
  );

  const timeline = (
    <div className={styles.timeline} aria-label="Mission timeline">
      <span className={styles.timelineFill} style={{ width: `${displayProgress * 100}%` }} />
      {events.map((event) => (
        <button
          key={event.id}
          type="button"
          className={styles.eventMarker}
          data-status={event.status === 'diagnosed' ? 'pending' : event.status}
          style={{ left: `${eventProgress(event, startedAt) * 100}%` }}
          title={`${event.system} · ${event.status}`}
          aria-label={`${event.system} event: ${event.status}`}
          onClick={() => {
            if (mode !== 'replay') return;
            setPlaying(false);
            setSelectedEventId(event.id);
            setReplayProgress(eventProgress(event, startedAt));
          }}
          disabled={mode !== 'replay'}
        >
          <span aria-hidden="true">
            {event.status === 'resolved' ? '✓' : event.status === 'failed' ? '×' : '•'}
          </span>
        </button>
      ))}
      <span className={styles.craftProgress} style={{ left: `${displayProgress * 100}%` }} aria-hidden="true">
        ◈
      </span>
    </div>
  );

  const content = (
    <>
      <div className={styles.trackerHeading}>
        <div>
          <span className={styles.eyebrow}>Mission Viz</span>
          <strong>{MISSION_TRAJECTORIES[missionId].label}</strong>
        </div>
        <span className={styles.days}>
          {Math.floor(displayProgress * missionDays)} / {missionDays} days
        </span>
      </div>
      <OrbitScene missionId={missionId} progress={displayProgress} />
      {timeline}
      <div className={styles.trackerFoot}>
        <span>{TRAJECTORY_NOTE}</span>
        {replay && (
          <span className={styles.legend}>
            <i data-status="pending" /> pending
            <i data-status="resolved" /> resolved
            <i data-status="failed" /> failed
          </span>
        )}
      </div>
    </>
  );

  if (mode === 'compact') {
    return (
      <section className={shellClass} aria-label="Mission trajectory tracker">
        {content}
      </section>
    );
  }

  return (
    <div className={shellClass} role={shellRole} aria-modal="true" aria-labelledby="mission-viz-title">
      <section className={styles.modalContent}>
        <header className={styles.modalHeader}>
          <div>
            <span className={styles.eyebrow}>{picker ? 'Stage 4 · Point design' : 'Debrief replay'}</span>
            <h2 id="mission-viz-title">
              {picker ? 'Choose a launch window' : 'Flight timeline'}
            </h2>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            Close
          </button>
        </header>

        <MarkerSlot markers={markers} anchor={overlayAnchor} />
        {showTutorial && tutorial && (
          <aside className={styles.tutorial} aria-label="Tracker tutorial">
            <span aria-hidden="true">{tutorial.visual ?? '◈'}</span>
            <div>
              <strong>{tutorial.title}</strong>
              <p>{tutorial.body}</p>
            </div>
          </aside>
        )}

        {content}

        {picker ? (
          <>
            <div className={styles.windowOptions}>
              {ISS_LAUNCH_WINDOWS.map((window) => (
                <button
                  type="button"
                  key={window.id}
                  data-selected={window.id === selectedWindowId}
                  onClick={() => onSelectWindow?.(window.id)}
                >
                  <strong>{window.label}</strong>
                  <span>{window.tripDays} trip days · {window.fuelCrates} fuel crates</span>
                  <small>{window.cost} game cost · {Math.round(window.risk * 100)}% risk</small>
                </button>
              ))}
            </div>
            <p className={styles.selectionNote}>
              {activeWindow
                ? `${activeWindow.label} selected · ${activeWindow.tripDays} trip days`
                : 'Select a window to cast your vote.'}
            </p>
          </>
        ) : (
          <div className={styles.replayControls}>
            <button type="button" onClick={() => setPlaying((current) => !current)}>
              {playing ? 'Pause replay' : 'Play replay'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setReplayProgress(0);
                setSelectedEventId(null);
              }}
            >
              Restart
            </button>
            {selectedEvent && (
              <span>
                {selectedEvent.system} · {selectedEvent.status}
              </span>
            )}
          </div>
        )}

        <p className={styles.creditLine}>
          Inspired by NASA Mission Viz · NASA does not endorse this project.
        </p>
      </section>
    </div>
  );
}
