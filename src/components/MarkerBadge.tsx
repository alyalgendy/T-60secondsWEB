import { cn } from "@/lib/cn";
import type { Marker, MarkerSeverity } from "@/lib/markers";
import type { AnchorId } from "@/lib/anchors";
import styles from "./MarkerBadge.module.css";

const TONE: Record<MarkerSeverity, string> = {
  info: styles.info,
  attention: styles.attention,
  critical: styles.critical,
};

const GLYPH: Record<MarkerSeverity, string> = {
  info: "●",
  attention: "▲",
  critical: "✕",
};

export function MarkerBadge({ marker }: { marker: Marker }) {
  return (
    <span className={cn(styles.badge, TONE[marker.severity])}>
      <span
        className={cn(marker.severity !== "info" && styles.pulse)}
        aria-hidden
      >
        {GLYPH[marker.severity]}
      </span>
      {marker.label}
    </span>
  );
}

/**
 * Anchored marker slot. Screens pass the selector output in; they never
 * decide what the marker says or whether it exists.
 */
export function MarkerSlot({
  markers,
  anchor,
  className,
}: {
  markers: Marker[];
  anchor: AnchorId;
  className?: string;
}) {
  const list = markers.filter((marker) => marker.anchor === anchor);
  if (list.length === 0) return null;
  return (
    <div className={cn(styles.slot, className)}>
      {list.map((marker) => (
        <MarkerBadge key={marker.id} marker={marker} />
      ))}
    </div>
  );
}
