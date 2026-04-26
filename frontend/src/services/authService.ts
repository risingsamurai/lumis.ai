import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from "firebase/auth";
import { auth, firebaseEnabled, googleProvider } from "../lib/firebase";

export const authService = {
  async signUp(email: string, pass: string) {
    if (!auth || !firebaseEnabled) throw new Error("Firebase not configured");
    return createUserWithEmailAndPassword(auth, email, pass);
  },

  async login(email: string, pass: string) {
    if (!auth || !firebaseEnabled) throw new Error("Firebase not configured");
    return signInWithEmailAndPassword(auth, email, pass);
  },

  async signInWithGoogle() {
    if (!auth || !firebaseEnabled) throw new Error("Firebase not configured");
    return signInWithPopup(auth, googleProvider);
  },

  async logout() {
    if (!auth) return;
    return signOut(auth);
  }
};
