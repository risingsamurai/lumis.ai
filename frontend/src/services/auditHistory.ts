import { db } from "../lib/firebase";
import { 
  collection, addDoc, getDocs, query, 
  orderBy, limit, where, Timestamp 
} from "firebase/firestore";

export interface AuditRecord {
  id?: string;
  userId: string;
  datasetName: string;
  protectedAttribute: string;
  fairnessScore: number;
  disparateImpact: number;
  statisticalParity: number;
  mitigationApplied: boolean;
  createdAt: Timestamp;
}

export async function saveAuditRecord(record: Omit<AuditRecord, "id" | "createdAt">) {
  try {
    if (!db) {
      console.error("Firebase db not initialized");
      return;
    }
    await addDoc(collection(db, "audit_history"), {
      ...record,
      createdAt: Timestamp.now()
    });
  } catch (e) {
    console.error("Failed to save audit record:", e);
  }
}

export async function getAuditHistory(userId: string): Promise<AuditRecord[]> {
  try {
    if (!db) {
      console.error("Firebase db not initialized");
      return [];
    }
    const q = query(
      collection(db, "audit_history"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditRecord));
  } catch (e) {
    console.error("Failed to fetch audit history:", e);
    return [];
  }
}
