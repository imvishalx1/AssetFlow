import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, type Functions } from 'firebase/functions';
import { env } from './env';

// Lazily-initialized Firebase instances. Only populated when VITE_MOCK_AUTH is
// *not* true; in mock mode the old axios + mockAdapter path continues to work.

let firebaseApp: ReturnType<typeof initializeApp> | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let functions: Functions | null = null;

const firebaseConfig: FirebaseOptions = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export function initFirebase(): void {
  if (firebaseApp) return; // already initialized

  if (env.VITE_MOCK_AUTH === 'true') {
    // In mock mode the Firebase SDK is NOT initialized — the existing
    // axios + mockAdapter handles everything. This file exports null-safe
    // getters so components can check isFirebaseReady() before using the SDK.
    return;
  }

  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
  functions = getFunctions(firebaseApp, 'us-central1');

  // Connect to local emulators in development
  if (env.VITE_FIREBASE_USE_EMULATOR === 'true') {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectFunctionsEmulator(functions, 'localhost', 5001);
  }
}

export function isFirebaseReady(): boolean {
  return firebaseApp !== null;
}

export function getFirebaseAuth(): Auth {
  if (!auth) throw new Error('Firebase Auth not initialized. Ensure VITE_MOCK_AUTH is false and initFirebase() was called.');
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) throw new Error('Firestore not initialized. Ensure VITE_MOCK_AUTH is false and initFirebase() was called.');
  return db;
}

export function getFirebaseFunctions(): Functions {
  if (!functions) throw new Error('Firebase Functions not initialized. Ensure VITE_MOCK_AUTH is false and initFirebase() was called.');
  return functions;
}
