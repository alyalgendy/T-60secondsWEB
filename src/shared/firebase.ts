import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';

/**
 * Public Firebase web configuration. These values identify the project to the
 * browser; they are not secrets, and access is controlled by the Realtime
 * Database rules. Keeping the full config here means local builds and GitHub
 * Pages work without repository secrets or a .env.local file.
 *
 * VITE_FIREBASE_* environment values still override any field when present.
 */
const FIREBASE_DEFAULTS = {
  apiKey: 'AIzaSyC9_vr4IH20Nlpq3nByxiQ6R5o48IIimjU',
  authDomain: 't60-seconds.firebaseapp.com',
  databaseURL: 'https://t60-seconds-default-rtdb.firebaseio.com',
  projectId: 't60-seconds',
  storageBucket: 't60-seconds.firebasestorage.app',
  messagingSenderId: '824391788045',
  appId: '1:824391788045:web:9c41eb0cfd2d97aa089744',
  measurementId: 'G-LFZKVTY3LR',
} as const;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || FIREBASE_DEFAULTS.apiKey,
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || FIREBASE_DEFAULTS.authDomain,
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    FIREBASE_DEFAULTS.databaseURL,
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID || FIREBASE_DEFAULTS.projectId,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    FIREBASE_DEFAULTS.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    FIREBASE_DEFAULTS.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || FIREBASE_DEFAULTS.appId,
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ||
    FIREBASE_DEFAULTS.measurementId,
};

/**
 * A room can be used without auth, but the app needs at least the database URL
 * and project id. Everything is optional at build time so the mock harness can
 * run with an empty .env file.
 */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.databaseURL && firebaseConfig.projectId,
);

let app: FirebaseApp | null = null;
let database: Database | null = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
  } catch (error) {
    console.error('Firebase failed to initialise.', error);
    app = null;
    database = null;
  }
}

export { app, database as db };

export function requireDb(): Database {
  if (!database) {
    throw new Error(
      'Firebase is not configured. Set VITE_FIREBASE_DATABASE_URL and VITE_FIREBASE_PROJECT_ID, or check src/shared/firebase.ts.',
    );
  }
  return database;
}
