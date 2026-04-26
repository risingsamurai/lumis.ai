import { create } from "zustand";
import type { AnalysisResult, MitigationResult } from "../services/api";

interface AuditState {
  selectedAuditId: string | null;
  latestAnalysis: AnalysisResult | null;
  latestMitigation: MitigationResult | null;
  loading: boolean;
  error: string | null;
  audits: any[];
  loadingAudits: boolean;
  hasFetchedAudits: boolean;
  setSelectedAuditId: (id: string) => void;
  setAnalysis: (analysis: AnalysisResult | null) => void;
  setMitigation: (mitigation: MitigationResult | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAudits: (audits: any[]) => void;
  setLoadingAudits: (loadingAudits: boolean) => void;
  setHasFetchedAudits: (hasFetchedAudits: boolean) => void;
}

export const useAuditStore = create<AuditState>((set) => ({
  selectedAuditId: null,
  latestAnalysis: null,
  latestMitigation: null,
  loading: false,
  error: null,
  audits: [],
  loadingAudits: false,
  hasFetchedAudits: false,
  setSelectedAuditId: (id) => set({ selectedAuditId: id }),
  setAnalysis: (analysis) => set({ latestAnalysis: analysis }),
  setMitigation: (mitigation) => set({ latestMitigation: mitigation }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setAudits: (audits) => set({ audits }),
  setLoadingAudits: (loadingAudits) => set({ loadingAudits }),
  setHasFetchedAudits: (hasFetchedAudits) => set({ hasFetchedAudits }),
}));
