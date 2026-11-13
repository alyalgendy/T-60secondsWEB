import type { Metadata } from "next";
import { MoonDemo } from "./MoonDemo";

export const metadata: Metadata = {
  title: "Moon planning — T-60",
  description: "Dev preview of the Moon mission planning scene.",
};

/**
 * Dev harness: /dev/moon?mock=1..4&seat=0..3
 *
 * This route only exists so the scene can be built and tested without the
 * mission flow. The real room route will pass the same PlanningSceneProps.
 */
export default async function DevMoonPage({
  searchParams,
}: {
  searchParams: Promise<{ mock?: string | string[]; seat?: string | string[] }>;
}) {
  const params = await searchParams;
  const first = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(first(params.mock) ?? "2", 10);
  const crewSize = Math.min(4, Math.max(1, Number.isFinite(parsed) ? parsed : 2));
  const rawSeat = Number.parseInt(first(params.seat) ?? "0", 10);
  const seatIndex = Math.min(
    crewSize - 1,
    Math.max(0, Number.isFinite(rawSeat) ? rawSeat : 0),
  );

  return (
    <MoonDemo
      key={`${crewSize}:${seatIndex}`}
      crewSize={crewSize}
      seatIndex={seatIndex}
    />
  );
}
