import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
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
      'Firebase is not configured. Copy .env.example to .env.local and add your project values.',
    );
  }
  return database;
}
