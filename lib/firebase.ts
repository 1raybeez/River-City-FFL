import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebasePublicEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const missingFirebasePublicEnvVars = Object.entries(firebasePublicEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missingFirebasePublicEnvVars.length > 0) {
  console.warn(
    `Firebase client config is missing public env vars: ${missingFirebasePublicEnvVars.join(", ")}`
  );
}

const firebaseConfig = {
  apiKey: firebasePublicEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: firebasePublicEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: firebasePublicEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: firebasePublicEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    firebasePublicEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebasePublicEnv.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase only if we're in the browser or if it's not already initialized
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Get the Firestore instance
const db = getFirestore(app);
const auth = getAuth(app);
const googleAuthProvider = new GoogleAuthProvider();

// Export as named exports for maximum compatibility
export { app, auth, db, GoogleAuthProvider, googleAuthProvider };
