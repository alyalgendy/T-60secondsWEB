import type { SubsystemOption } from '../../shared/types';
import { radarValues } from './designLogic';
import styles from './DesignScene.module.css';

const LABELS = ['Mass', 'Power', 'Cost', 'Risk', 'Reliability'];

function point(index: number, radius: number): string {
  const angle = ((index * 72 - 90) * Math.PI) / 180;
  return `${50 + Math.cos(angle) * radius} ${50 + Math.sin(angle) * radius}`;
}

export default function RadarChart({
  option,
}: {
  option: SubsystemOption;
}) {
  const values = radarValues(option);
  const shape = values
    .map((value, index) => point(index, 34 * value))
    .join(', ');
  const grid = [1 / 3, 2 / 3, 1].map((scale) =>
    LABELS.map((_, index) => point(index, 34 * scale)).join(', '),
  );

  return (
    <figure className={styles.radar}>
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label={`${option.label} system trade study`}
      >
        {grid.map((points, index) => (
          <polygon
            key={index}
            className={styles.radarGrid}
            points={points}
          />
        ))}
        {LABELS.map((label, index) => {
          const angle = ((index * 72 - 90) * Math.PI) / 180;
          const x = 50 + Math.cos(angle) * 44;
          const y = 50 + Math.sin(angle) * 44;
          return (
            <g key={label}>
              <line
                className={styles.radarAxis}
                x1="50"
                y1="50"
                x2={50 + Math.cos(angle) * 34}
                y2={50 + Math.sin(angle) * 34}
              />
              <text className={styles.radarLabel} x={x} y={y}>
                {label}
              </text>
            </g>
          );
        })}
        <polygon className={styles.radarValue} points={shape} />
      </svg>
    </figure>
  );
}
