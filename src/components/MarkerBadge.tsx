import { cn } from "@/lib/cn";
import type { Marker, MarkerSeverity } from "@/lib/markers";
import type { AnchorId } from "@/lib/anchors";

const TONE: Record<MarkerSeverity, string> = {
  info: "border-crew/35 bg-crew/10 text-crew",
  attention: "border-warn/40 bg-warn/10 text-warn",
  critical: "border-alert/45 bg-alert/10 text-alert",
};

export function MarkerBadge({ marker }: { marker: Marker }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        TONE[marker.severity],
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full bg-current",
          marker.severity !== "info" && "animate-pulse",
        )}
        aria-hidden
      />
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
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {list.map((marker) => (
        <MarkerBadge key={marker.id} marker={marker} />
      ))}
    </div>
  );
}
