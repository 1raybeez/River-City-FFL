import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCP0M7e1N758YAC1Zzyrj5hA8ns9ZilUC4",
  authDomain: "river-city-ffl.firebaseapp.com",
  projectId: "river-city-ffl",
  storageBucket: "river-city-ffl.firebasestorage.app",
  messagingSenderId: "905503961976",
  appId: "1:905503961976:web:6219debd8f793f8a1f4e8d",
  measurementId: "G-X8MXRMTKYW"
};

// Initialize Firebase only if we're in the browser or if it's not already initialized
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Get the Firestore instance
const db = getFirestore(app);

// Export both as named exports for maximum compatibility
export { app, db };