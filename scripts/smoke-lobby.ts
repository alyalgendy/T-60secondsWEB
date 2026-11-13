/**
 * End-to-end lobby check against the real Firebase Realtime Database emulator.
 * It uses the same service layer the UI uses, so a green run proves the
 * production code path: create, join, reject, ready, launch, presence,
 * host migration, reconnect, kick and leave.
 *
 * Run with: npm run test:lobby
 */
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectDatabaseEmulator,
  get,
  getDatabase,
  ref,
  type Database,
} from "firebase/database";
import {
  bindPresence,
  ensureHost,
  enterRoom,
  kickPlayer,
  leaveRoom,
  returnToLobby,
  setReady,
  startPreflight,
  watchRoom,
} from "../src/lib/lobby-service";
import { ANCHORS, isStaticAnchor } from "../src/lib/anchors";
import { getLobbyMarkers } from "../src/lib/markers";
import { generateRoomCode } from "../src/lib/room-code";
import { TUTORIAL_STEPS } from "../src/lib/tutorial";
import { LobbyError, toRoomView, type RoomView } from "../src/lib/types";

const EMULATOR = process.env.FIREBASE_DATABASE_EMULATOR_HOST ?? "127.0.0.1:9000";
const [HOST, PORT_RAW] = EMULATOR.split(":");
const PORT = Number(PORT_RAW ?? 9000);
const NAMESPACE = "demo-t60";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let appCounter = 0;
interface Client {
  app: FirebaseApp;
  db: Database;
  playerId: string;
}

function createClient(label: string): Client {
  appCounter += 1;
  const app = initializeApp(
    { projectId: NAMESPACE, databaseURL: `http://${HOST}:${PORT}?ns=${NAMESPACE}` },
    `smoke-${label}-${appCounter}`,
  );
  const db = getDatabase(app);
  connectDatabaseEmulator(db, HOST, PORT);
  return { app, db, playerId: `p_smoke${label}${appCounter}abcdef` };
}

async function waitFor<T>(
  label: string,
  probe: () => Promise<T | null | undefined> | T | null | undefined,
  timeoutMs = 10_000,
): Promise<T> {
  const started = Date.now();
  let last: T | null | undefined = null;
  while (Date.now() - started < timeoutMs) {
    last = await probe();
    if (last !== null && last !== undefined && last !== false) return last;
    await sleep(100);
  }
  throw new Error(`Timed out waiting for: ${label}`);
}

async function connected(client: Client): Promise<void> {
  await waitFor(`${client.playerId} socket`, async () => {
    const snapshot = await get(ref(client.db, ".info/connected"));
    return snapshot.val() === true;
  });
}

async function roomOf(client: Client, code: string): Promise<RoomView | null> {
  const snapshot = await get(ref(client.db, `rooms/${code}`));
  return toRoomView(code, snapshot.val());
}

async function expectError(run: () => Promise<unknown>, code: string): Promise<LobbyError> {
  try {
    await run();
  } catch (error) {
    const lobbyError = error instanceof LobbyError ? error : null;
    if (!lobbyError) throw new Error(`Expected LobbyError ${code}, got ${String(error)}`);
    if (lobbyError.code !== code) {
      throw new Error(`Expected ${code}, got ${lobbyError.code}: ${lobbyError.message}`);
    }
    return lobbyError;
  }
  throw new Error(`Expected an error with code ${code}, but the call succeeded.`);
}

const checks: string[] = [];
function pass(label: string) {
  checks.push(label);
  console.log(`  \u2713 ${label}`);
}

async function main() {
  console.log(`\nLobby smoke test against ${EMULATOR} (ns ${NAMESPACE})\n`);

  // ---- static guarantees -------------------------------------------------
  for (const step of TUTORIAL_STEPS) {
    if (!isStaticAnchor(step.anchor)) {
      throw new Error(`Tutorial step "${step.id}" points at missing anchor "${step.anchor}"`);
    }
  }
  if (TUTORIAL_STEPS.length === 0) throw new Error("No tutorial steps defined");
  if (ANCHORS.length === 0) throw new Error("No anchors defined");
  pass(`${TUTORIAL_STEPS.length} tutorial steps, all anchors valid`);

  const code = generateRoomCode();
  const host = createClient("host");
  const guest = createClient("guest");

  // ---- create + join -----------------------------------------------------
  await connected(host);
  await connected(guest);

  const updates: RoomView[] = [];
  const stopWatch = watchRoom(host.db, code, (room) => {
    if (room) updates.push(room);
  });

  await enterRoom({ db: host.db, code, playerId: host.playerId, name: "Ava", create: true });
  await waitFor("host seated", async () => (await roomOf(host, code))?.players.length === 1);
  pass("create room seats the commander");

  await enterRoom({ db: guest.db, code, playerId: guest.playerId, name: "Bo", create: false });
  await waitFor("guest seated", async () => (await roomOf(guest, code))?.players.length === 2);
  pass("invite code joins the crew");

  await waitFor("live broadcast", async () => updates.at(-1)?.players.length === 2);
  pass("live state broadcasts to other clients");

  // ---- markers derive from state ----------------------------------------
  const hostView = (await roomOf(host, code))!;
  const hostMarkers = getLobbyMarkers(hostView, host.playerId);
  if (!hostMarkers.some((marker) => marker.id === "waiting-crew")) {
    throw new Error("Commander should get a waiting-crew marker while a guest is not ready");
  }
  const guestMarkers = getLobbyMarkers(hostView, guest.playerId);
  if (!guestMarkers.some((marker) => marker.id === "you-standby")) {
    throw new Error("Unready guest should get the you-standby marker");
  }
  pass("markers derive from live state");

  // ---- ready gate --------------------------------------------------------
  await expectError(() => startPreflight(host.db, code), "not-ready");
  pass("launch is blocked until every connected player is ready");

  await setReady(guest.db, code, guest.playerId, true);
  await waitFor("guest ready", async () => {
    const room = await roomOf(host, code);
    return room?.players.find((player) => player.id === guest.playerId)?.ready === true;
  });
  pass("ready state syncs across clients");

  await setReady(host.db, code, host.playerId, true);
  await startPreflight(host.db, code);
  await waitFor("phase briefing", async () => (await roomOf(guest, code))?.phase === "BRIEFING");
  pass("commander launches preflight for the whole room");

  await returnToLobby(host.db, code);
  await waitFor("phase lobby", async () => (await roomOf(guest, code))?.phase === "LOBBY");
  pass("commander can return the room to assembly");

  // ---- rejections --------------------------------------------------------
  const squatter = createClient("squatter");
  await connected(squatter);
  await expectError(
    () => enterRoom({ db: squatter.db, code, playerId: squatter.playerId, name: "Cy", create: true }),
    "room-exists",
  );
  pass("creating a duplicate code is rejected");

  const drifter = createClient("drifter");
  await connected(drifter);
  const missingCode = generateRoomCode();
  await expectError(
    () =>
      enterRoom({
        db: drifter.db,
        code: missingCode,
        playerId: drifter.playerId,
        name: "Di",
        create: false,
      }),
    "room-not-found",
  );
  pass("joining a non-existent code is rejected instead of creating a ghost room");

  // ---- presence + host migration ----------------------------------------
  const stopPresenceHost = bindPresence(host.db, code, host.playerId);
  const stopPresenceGuest = bindPresence(guest.db, code, guest.playerId);
  await sleep(600);

  await deleteApp(host.app);
  await waitFor(
    "host marked offline",
    async () => {
      const snapshot = await get(ref(guest.db, `rooms/${code}/players/${host.playerId}/connected`));
      return snapshot.val() === false;
    },
    12_000,
  );
  pass("disconnect marks the seat offline and holds it");

  const playersBefore = (await get(ref(guest.db, `rooms/${code}/players`))).val() ?? {};
  await ensureHost(guest.db, code, playersBefore);
  await waitFor(
    "host migrated",
    async () => (await get(ref(guest.db, `rooms/${code}/hostId`))).val() === guest.playerId,
  );
  pass("host migrates to the earliest remaining player");

  // ---- reconnect ---------------------------------------------------------
  const returning = createClient("returning");
  returning.playerId = host.playerId;
  await connected(returning);
  await enterRoom({
    db: returning.db,
    code,
    playerId: host.playerId,
    name: "Ava",
    create: false,
  });
  await waitFor("original host reseated", async () => {
    const snapshot = await get(ref(returning.db, `rooms/${code}/players/${host.playerId}/connected`));
    return snapshot.val() === true;
  });
  const afterReturn = (await roomOf(returning, code))!;
  if (afterReturn.hostId !== guest.playerId) {
    throw new Error("Reconnecting player should not steal command back");
  }
  if (afterReturn.players.length !== 2) {
    throw new Error(`Expected 2 seated players after reconnect, got ${afterReturn.players.length}`);
  }
  pass("reconnect restores the seat without stealing command");

  // ---- kick + leave ------------------------------------------------------
  await kickPlayer(guest.db, code, host.playerId);
  await waitFor(
    "kicked seat removed",
    async () =>
      (await get(ref(guest.db, `rooms/${code}/players/${host.playerId}`))).val() === null,
  );
  pass("commander can remove an offline seat");

  await leaveRoom(guest.db, code, guest.playerId);
  await waitFor(
    "empty seats",
    async () => (await get(ref(guest.db, `rooms/${code}/players`))).numChildren() === 0,
  );
  pass("leaving releases the seat immediately");

  stopPresenceHost();
  stopPresenceGuest();
  stopWatch();
  await Promise.allSettled([
    deleteApp(guest.app),
    deleteApp(squatter.app),
    deleteApp(drifter.app),
    deleteApp(returning.app),
  ]);

  console.log(`\nAll ${checks.length} lobby checks passed.\n`);
}

main().catch((error) => {
  console.error(`\nLobby smoke test FAILED: ${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
});
