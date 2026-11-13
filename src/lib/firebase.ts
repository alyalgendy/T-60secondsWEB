import { initializeApp, getApp, getApps } from "firebase/app";
import { connectDatabaseEmulator, getDatabase, type Database } from "firebase/database";

export const EMULATOR_HOST = "127.0.0.1";
export const EMULATOR_PORT = 9000;
export const EMULATOR_NAMESPACE = "demo-t60";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const explicit = process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATOR;

/**
 * With no Firebase keys configured, everything runs against the local
 * emulator. That is the default developer experience: `npm run dev` and go.
 */
export const emulatorMode = explicit ? explicit === "1" : !config.apiKey;

const databaseURL =
  config.databaseURL ?? `http://${EMULATOR_HOST}:${EMULATOR_PORT}?ns=${EMULATOR_NAMESPACE}`;

export function getDb(): Database {
  const globalStore = globalThis as typeof globalThis & { __t60Database?: Database };
  if (globalStore.__t60Database) return globalStore.__t60Database;

  const app = getApps().length
    ? getApp()
    : initializeApp({
        ...config,
        projectId: config.projectId ?? EMULATOR_NAMESPACE,
        databaseURL,
      });

  const db = getDatabase(app);
  if (emulatorMode) connectDatabaseEmulator(db, EMULATOR_HOST, EMULATOR_PORT);

  globalStore.__t60Database = db;
  return db;
}
