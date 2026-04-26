import { useState, useCallback } from "react";
import {
  analyzeDataset, mitigateDataset, fileToBase64,
  AnalysisResult, MitigationResult, AnalyzeRequest,
  detectSchema, detectPositiveLabelValue
} from "../services/api";
import toast from "react-hot-toast";

export type AnalysisStep = "idle" | "uploading" | "configuring" | "analyzing" | "done" | "error";

interface AnalysisState {
  step: AnalysisStep;
  file: File | null;
  csvColumns: string[];
  columnValues: Record<string, string[]>;
  request: Partial<AnalyzeRequest>;
  result: AnalysisResult | null;
  mitigation: MitigationResult | null;
  error: string | null;
  progress: number;
}

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>({
    step: "idle",
    file: null,
    csvColumns: [],
    columnValues: {},
    request: {},
    result: null,
    mitigation: null,
    error: null,
    progress: 0,
  });

  const parseCSVColumns = (text: string): string[] => {
    const firstLine = text.split("\n")[0];
    return firstLine
      .split(",")
      .map(c => c.trim().replace(/"/g, "").replace(/\r/g, ""))
      .filter(Boolean);
  };

  const parseColumnValues = (text: string, column: string): string[] => {
    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = parseCSVColumns(lines[0]);
    const idx = headers.indexOf(column);
    if (idx === -1) return [];
    return [...new Set(
      lines.slice(1)
        .map(l => l.split(",")[idx]?.trim().replace(/"/g, "").replace(/\r/g, ""))
        .filter(Boolean)
    )].slice(0, 30);
  };

  const loadFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const columns = parseCSVColumns(text);

      // Auto-detect schema
      const schema = detectSchema(columns);

      // If low confidence, show configuration modal
      if (schema.confidence === "low") {
        setState(s => ({
          ...s,
          step: "configuring",
          file,
          csvColumns: columns,
          columnValues: {},
          request: {},
          result: null,
          mitigation: null,
          error: null,
        }));
        return;
      }

      // Auto-detect positive label value for target column
      const targetValues = schema.targetColumn ? parseColumnValues(text, schema.targetColumn) : [];
      const labelValue = detectPositiveLabelValue(targetValues);

      // Auto-detect and trigger analysis
      setState(s => ({
        ...s,
        step: "analyzing",
        file,
        csvColumns: columns,
        columnValues: {},
        request: {
          targetColumn: schema.targetColumn,
          sensitiveAttributes: schema.sensitiveAttributes,
          labelValue,
        },
        result: null,
        mitigation: null,
        error: null,
        progress: 0,
      }));

      // Trigger analysis
      try {
        const base64 = await fileToBase64(file);
        const fullRequest: AnalyzeRequest = {
          datasetBase64: base64,
          targetColumn: schema.targetColumn,
          sensitiveAttributes: schema.sensitiveAttributes,
          labelValue,
          discoveryMode: true,
        };

        const result = await analyzeDataset(fullRequest);

        setState(s => ({
          ...s,
          step: "done",
          result,
          progress: 100,
          request: { ...s.request, datasetBase64: base64 },
        }));

      } catch (err: any) {
        const msg = err.message || "Analysis failed";
        setState(s => ({ ...s, step: "error", error: msg, progress: 0 }));
        toast.error(msg);
      }
    };
    reader.onerror = () => toast.error("Failed to read file");
    reader.readAsText(file);
  }, []);

  const loadColumnValues = useCallback((column: string) => {
    if (!state.file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const values = parseColumnValues(text, column);
      setState(s => ({
        ...s,
        columnValues: { ...s.columnValues, [column]: values },
      }));
    };
    reader.readAsText(state.file);
  }, [state.file]);

  const setConfig = useCallback((key: keyof AnalyzeRequest, value: any) => {
    setState(s => ({ ...s, request: { ...s.request, [key]: value } }));
  }, []);

  const runAnalysis = useCallback(async () => {
    const { file, request } = state;
    if (!file || !request.targetColumn || !request.sensitiveAttributes || !request.labelValue) {
      toast.error("Please complete all configuration fields");
      return;
    }

    setState(s => ({ ...s, step: "analyzing", error: null, progress: 0 }));

    // Progress simulation (backend takes 20-60s)
    const progressInterval = setInterval(() => {
      setState(s => ({
        ...s,
        progress: Math.min(s.progress + Math.random() * 8, 85)
      }));
    }, 1500);

    try {
      const base64 = await fileToBase64(file);
      const fullRequest: AnalyzeRequest = {
        datasetBase64: base64,
        targetColumn: request.targetColumn!,
        sensitiveAttributes: request.sensitiveAttributes!,
        labelValue: request.labelValue!,
      };

      const result = await analyzeDataset(fullRequest);
      clearInterval(progressInterval);

      setState(s => ({
        ...s,
        step: "done",
        result,
        progress: 100,
        request: { ...s.request, datasetBase64: base64 },
      }));

    } catch (err: any) {
      clearInterval(progressInterval);
      const msg = err.message || "Analysis failed";
      setState(s => ({ ...s, step: "error", error: msg, progress: 0 }));
      toast.error(msg);
    }
  }, [state]);

  const runMitigation = useCallback(async () => {
    const { request } = state;
    if (!request.datasetBase64 || !request.targetColumn) return;

    setState(s => ({ ...s, step: "analyzing", progress: 0 }));
    const progressInterval = setInterval(() => {
      setState(s => ({ ...s, progress: Math.min(s.progress + 5, 85) }));
    }, 1500);

    try {
      const mitigation = await mitigateDataset(request as AnalyzeRequest);
      clearInterval(progressInterval);
      setState(s => ({ ...s, step: "done", mitigation, progress: 100 }));
      toast.success("Bias mitigation complete!");
    } catch (err: any) {
      clearInterval(progressInterval);
      toast.error(err.message || "Mitigation failed");
      setState(s => ({ ...s, step: "done", progress: 100 }));
    }
  }, [state]);

  const reset = useCallback(() => {
    setState({
      step: "idle", file: null, csvColumns: [], columnValues: {},
      request: {}, result: null, mitigation: null, error: null, progress: 0,
    });
  }, []);

  const loadDemoDataset = useCallback(async (id: string) => {
    const DEMO_CONFIGS: Record<string, {
      file: string;
      targetColumn: string;
      sensitiveAttributes: string[];
      labelValue: string | number;
    }> = {
      hiring:     { file: "/demo/adult_income.csv",  targetColumn: "income",         sensitiveAttributes: ["sex"],    labelValue: ">50K" },
      lending:    { file: "/demo/home_credit.csv",   targetColumn: "approved",       sensitiveAttributes: ["gender"], labelValue: 1      },
      healthcare: { file: "/demo/healthcare.csv",    targetColumn: "readmitted",     sensitiveAttributes: ["race"],   labelValue: 1      },
      criminal:   { file: "/demo/compas.csv",        targetColumn: "two_year_recid", sensitiveAttributes: ["race"],   labelValue: 1      },
    };

    const config = DEMO_CONFIGS[id];
    if (!config) return;

    try {
      const res = await fetch(config.file);
      if (!res.ok) throw new Error(`Demo file not found (${res.status})`);
      const csvText = await res.text();
      const blob = new Blob([csvText], { type: "text/csv" });
      const file = new File([blob], `${id}_demo.csv`, { type: "text/csv" });
      const columns = csvText.split("\n")[0]
        .split(",").map(c => c.trim().replace(/"/g, "").replace(/\r/g, ""));

      setState(s => ({
        ...s,
        step: "analyzing",
        file,
        csvColumns: columns,
        request: {
          targetColumn: config.targetColumn,
          sensitiveAttributes: config.sensitiveAttributes,
          labelValue: config.labelValue,
        },
        result: null,
        mitigation: null,
        error: null,
        progress: 0,
      }));

      const base64 = await fileToBase64(file);
      const fullRequest: AnalyzeRequest = {
        datasetBase64: base64,
        targetColumn: config.targetColumn,
        sensitiveAttributes: config.sensitiveAttributes,
        labelValue: config.labelValue,
      };

      const progressInterval = setInterval(() => {
        setState(s => ({ ...s, progress: Math.min(s.progress + 6, 85) }));
      }, 1500);

      const result = await analyzeDataset(fullRequest);
      clearInterval(progressInterval);

      setState(s => ({
        ...s,
        step: "done",
        result,
        progress: 100,
        request: { ...s.request, datasetBase64: base64 },
      }));

    } catch (err: any) {
      setState(s => ({ ...s, step: "error", error: err.message, progress: 0 }));
      toast.error(err.message);
    }
  }, []);

  return { state, loadFile, loadColumnValues, setConfig, runAnalysis, runMitigation, reset, loadDemoDataset };
}
