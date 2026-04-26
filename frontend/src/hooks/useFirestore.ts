import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { useAuth } from "./useAuth";
import type { Audit } from "../types/audit";

export function useAudits() {
  const { user } = useAuth();
  const [audits, setAudits] = useState<Audit[]>([]);

  useEffect(() => {
    if (!user || !db) {
      return;
    }
    const q = query(collection(db, "audits"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const next = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Audit, "id">) }));
      setAudits(next);
    });
    return () => unsub();
  }, [user]);

  return audits;
}
