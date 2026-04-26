import { useEffect, type PropsWithChildren } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, firebaseEnabled } from "../lib/firebase";
import { useAuthStore } from "../store/authStore";
import { authService } from "../services/authService";

export function AuthProvider({ children }: PropsWithChildren) {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    if (!auth || !firebaseEnabled) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  return <>{children}</>;
}

export function useAuth() {
  const { user, loading } = useAuthStore();
  return {
    user,
    loading,
    login: authService.login,
    signup: authService.signUp,
    signInWithGoogle: authService.signInWithGoogle,
    logout: authService.logout,
  };
}
