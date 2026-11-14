import type { MissionConfig, MissionId, ResourceKey } from '../types';
import { toReservePercent } from '../scoring';
import styles from './MissionViz.module.css';

const REFERENCE_WATER_LITERS_PER_CREW_DAY = 3.785 / 3;
const RESOURCE_KEYS = ['oxygen', 'water', 'power'] as const;
const RESOURCE_NAMES: Record<(typeof RESOURCE_KEYS)[number], string> = {
  oxygen: 'O₂ reserve',
  water: 'Water reserve',
  power: 'Power reserve',
};

const DESTINATIONS: Record<MissionId, { label: string }> = {
  iss: { label: 'ISS · LOW EARTH ORBIT' },
  moon: { label: 'LUNAR SOUTH POLE' },
  mars: { label: 'MARS' },
};

export interface MissionVizProps {
  config: Pick<MissionConfig, 'id' | 'durationDays' | 'needs'>;
  crewCount: number;
  resources: Partial<Record<ResourceKey, number>>;
  elapsedDays?: number;
  phase: string;
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString();
}

export function MissionViz({
  config,
  crewCount,
  resources,
  elapsedDays = 0,
  phase,
}: MissionVizProps) {
  const missionId = config.id;
  const duration = Math.max(1, config.durationDays);
  const safeElapsedDays = Number.isFinite(elapsedDays) ? elapsedDays : 0;
  const day = Math.max(0, Math.min(duration, safeElapsedDays));
  const progress = day / duration;
  const crew = Number.isFinite(crewCount) ? Math.max(1, crewCount) : 1;
  const waterForecast = REFERENCE_WATER_LITERS_PER_CREW_DAY * crew * duration;
  const waterToDate = REFERENCE_WATER_LITERS_PER_CREW_DAY * crew * day;
  const destination = DESTINATIONS[missionId];
  const shipX = 64 + progress * 382;
  const shipY = 76 - Math.sin(progress * Math.PI) * 35;

  return (
    <section className={styles.viz} aria-label={`${destination.label} mission visualization`}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Mission trajectory · schematic</span>
          <h3 className={styles.title}>{destination.label}</h3>
        </div>
        <span className={styles.day}>
          DAY {Math.floor(day)} <span>/ {duration}</span>
        </span>
      </div>

      <svg
        className={styles.trajectory}
        viewBox="0 0 500 124"
        role="img"
        aria-label={`Schematic route from Earth to ${destination.label}; mission is ${Math.round(
          progress * 100,
        )}% through its planned timeline.`}
      >
        <path className={styles.routeGlow} d="M48 78 C165 10 327 137 456 59" />
        <path className={styles.route} d="M48 78 C165 10 327 137 456 59" />
        <circle className={styles.earthGlow} cx="48" cy="78" r="22" />
        <circle className={styles.earth} cx="48" cy="78" r="12" />
        <path className={styles.earthMark} d="M40 77c5-5 7-5 10-1l4 1-2 5-6 2-3-3z" />
        {missionId === 'iss' ? (
          <>
            <ellipse className={styles.orbit} cx="48" cy="78" rx="26" ry="15" />
            <path className={styles.station} d="M448 59h16m-8-7v14m-7-10 14 6m-14 0 14-6" />
          </>
        ) : (
          <circle
            className={missionId === 'moon' ? styles.moon : styles.mars}
            cx="456"
            cy="59"
            r={missionId === 'moon' ? '10' : '12'}
            style={{ fill: missionId === 'moon' ? '#c4cfda' : '#d65b47' }}
          />
        )}
        <g
          className={styles.ship}
          transform={`translate(${shipX} ${shipY}) rotate(-18)`}
          aria-hidden="true"
        >
          <path d="M0-8 4 3 0 1-4 3z" />
          <path className={styles.shipTrail} d="M0 4v8" />
        </g>
        <text className={styles.earthLabel} x="32" y="111">EARTH</text>
        <text className={styles.destinationLabel} x="485" y="111" textAnchor="end">
          {missionId === 'iss' ? 'ISS' : missionId.toUpperCase()}
        </text>
      </svg>

      <div className={styles.phaseRow}>
        <span>{phase}</span>
        <span className={styles.phaseTrack} aria-hidden="true">
          <span style={{ width: `${progress * 100}%` }} />
        </span>
        <span>{Math.round(progress * 100)}%</span>
      </div>

      <div className={styles.systems} aria-label="Planned reserve coverage">
        {RESOURCE_KEYS.map((key) => {
          const cap = config.needs.find((need) => need.key === key)?.max ?? 100;
          const value = toReservePercent(resources[key] ?? 0, cap);
          return (
            <div className={styles.system} key={key}>
              <div className={styles.systemHead}>
                <span>{RESOURCE_NAMES[key]}</span>
                <strong>{Math.round(value)}%</strong>
              </div>
              <div
                className={styles.systemTrack}
                role="meter"
                aria-label={RESOURCE_NAMES[key]}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(value)}
              >
                <span style={{ width: `${value}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.science}>
        <div>
          <span className={styles.scienceLabel}>ISS water-resupply reference</span>
          <strong>≈ {formatNumber(waterForecast)} L</strong>
          <span className={styles.scienceDetail}>
            for {crew} crew across {duration} days at ⅓ gal per crew-day
          </span>
        </div>
        <span className={styles.scienceCurrent}>
          {formatNumber(waterToDate)} L by day {Math.floor(day)}
        </span>
      </div>

      <p className={styles.note}>
        Water figure is an ISS benchmark, not a Moon/Mars vehicle specification. ISS life support
        has demonstrated up to 98% water recovery
        {missionId === 'iss' ? '.' : '; exploration systems still need destination-specific validation.'}
        {' '}Trajectory is schematic—not to scale or propagated with GMAT.
      </p>

      {missionId === 'mars' ? (
        <p className={styles.note}>
          NASA is developing space-food systems for exploration missions lasting up to five years.
        </p>
      ) : null}

      <div className={styles.sources}>
        <a
          href="https://www.nasa.gov/international-space-station/space-station-facts-and-figures/"
          target="_blank"
          rel="noreferrer"
        >
          NASA · Station facts
        </a>
        <a
          href="https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/"
          target="_blank"
          rel="noreferrer"
        >
          NASA · Water recovery
        </a>
        {missionId === 'mars' ? (
          <a
            href="https://www.nasa.gov/directorates/esdmd/hhp/space-food-systems/"
            target="_blank"
            rel="noreferrer"
          >
            NASA · Space food
          </a>
        ) : null}
        {missionId === 'iss' ? (
          <span className={styles.powerReference}>ISS arrays: 75–90 kW</span>
        ) : null}
        <a
          className={styles.vizSource}
          href="https://github.com/nasa/mission-viz"
          target="_blank"
          rel="noreferrer"
        >
          Mission Viz inspiration
        </a>
      </div>
    </section>
  );
}
