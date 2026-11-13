"use client";

import { useParams } from "next/navigation";
import { normalizeRoomCode } from "@/lib/room-code";
import { RoomScreen } from "./RoomScreen";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = normalizeRoomCode(String(params?.code ?? ""));
  return <RoomScreen code={code} />;
}
