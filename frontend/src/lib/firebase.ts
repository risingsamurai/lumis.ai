import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(
  (value) => typeof value === "string" && value.length > 0
);

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = hasFirebaseConfig ? getAuth(app) : null;
export const db = hasFirebaseConfig ? getFirestore(app) : null;
export const googleProvider = new GoogleAuthProvider();

export const firebaseEnabled = Boolean(import.meta.env.VITE_FIREBASE_API_KEY);
