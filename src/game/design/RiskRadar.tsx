import styles from './DesignScene.module.css';

function point(index: number, radius: number): string {
  const angle = ((index * 120 - 90) * Math.PI) / 180;
  return `${50 + Math.cos(angle) * radius} ${50 + Math.sin(angle) * radius}`;
}

export default function RiskRadar({
  risk,
  reliability,
  fit,
}: {
  risk: number;
  reliability: number;
  fit: number;
}) {
  const values = [risk, reliability, fit];
  const points = values.map((value, index) => point(index, 34 * value)).join(', ');
  const grid = [1 / 3, 2 / 3, 1].map((scale) =>
    values.map((_, index) => point(index, 34 * scale)).join(', '),
  );
  return (
    <figure className={styles.riskRadar}>
      <svg viewBox="0 0 100 100" role="img" aria-label="Risk, reliability, and fit radar">
        {grid.map((polygon, index) => (
          <polygon key={index} className={styles.radarGrid} points={polygon} />
        ))}
        {values.map((_, index) => (
          <line
            key={index}
            className={styles.radarAxis}
            x1="50"
            y1="50"
            x2={point(index, 34).split(' ')[0]}
            y2={point(index, 34).split(' ')[1]}
          />
        ))}
        <polygon className={styles.radarValue} points={points} />
      </svg>
    </figure>
  );
}
