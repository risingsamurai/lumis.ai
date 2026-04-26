import { create } from "zustand";
import type { AnalysisResult, MitigationResult } from "../services/api";

interface AuditState {
  selectedAuditId: string | null;
  latestAnalysis: AnalysisResult | null;
  latestMitigation: MitigationResult | null;
  loading: boolean;
  error: string | null;
  setSelectedAuditId: (id: string) => void;
  setAnalysis: (analysis: AnalysisResult | null) => void;
  setMitigation: (mitigation: MitigationResult | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuditStore = create<AuditState>((set) => ({
  selectedAuditId: null,
  latestAnalysis: null,
  latestMitigation: null,
  loading: false,
  error: null,
  setSelectedAuditId: (id) => set({ selectedAuditId: id }),
  setAnalysis: (analysis) => set({ latestAnalysis: analysis }),
  setMitigation: (mitigation) => set({ latestMitigation: mitigation }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
