import { db } from "../lib/firebase";
import { addDoc, collection, Timestamp, query, where, orderBy, getDocs, doc, getDoc, deleteDoc } from "firebase/firestore";
import type { 
  Severity, 
  AttributeMetrics, 
  Recommendation, 
  DistributionPoint, 
  IntersectionalPoint, 
  ProxyVariable, 
  HeatmapCell 
} from "../types/audit";

export interface AuditRecord {
  id?: string;
  userId: string;
  datasetName: string;
  datasetUrl?: string;
  createdAt: Timestamp;
  metrics: Record<string, AttributeMetrics>;
  biasScore: number;
  summary: string;
  top_features: string[];
  recommendations: Recommendation[];
  rowCount?: number;
  severity?: Severity;
  distributions?: DistributionPoint[];
  intersectional?: IntersectionalPoint[];
  proxyVariables?: ProxyVariable[];
  heatmap?: HeatmapCell[];
}

export const firestoreService = {
  async saveAudit(auditData: Omit<AuditRecord, "id" | "createdAt">) {
    if (!db) throw new Error("Firestore not initialized");

    try {
      const docRef = await addDoc(collection(db, "audits"), {
        ...auditData,
        createdAt: Timestamp.now(),
      });
      return { ...auditData, createdAt: Timestamp.now(), id: docRef.id };
    } catch (error: any) {
      throw new Error("Failed to save audit: " + (error.message || "Unknown error"));
    }
  },

  async getUserAudits(userId: string): Promise<AuditRecord[]> {
    if (!db) throw new Error("Firestore not initialized");
    try {
      const q = query(
        collection(db, "audits"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as AuditRecord));
    } catch (error: any) {
      throw new Error("Failed to fetch user audits: " + (error.message || "Unknown error"));
    }
  },

  async getAuditById(id: string): Promise<AuditRecord | null> {
    if (!db) throw new Error("Firestore not initialized");
    try {
      const docRef = doc(db, "audits", id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as AuditRecord;
    } catch (error: any) {
      throw new Error("Failed to fetch audit: " + (error.message || "Unknown error"));
    }
  },

  async deleteAudit(id: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    try {
      const docRef = doc(db, "audits", id);
      await deleteDoc(docRef);
    } catch (error: any) {
      throw new Error("Failed to delete audit: " + (error.message || "Unknown error"));
    }
  }
};
