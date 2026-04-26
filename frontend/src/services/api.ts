import type { AnalyzeResponse, MitigateResponse } from "../types/api";

export interface AnalyzePayload {
  dataset_base64: string;
  target_column: string;
  sensitive_attributes: string[];
  favorable_outcome: string | number;
  top_k_features?: number;
}

const BASE_URL = import.meta.env.VITE_ANALYZER_BASE_URL ?? "https://cfisshy-ai.onrender.com";

export async function checkBackend() {
  const res = await fetch(`${BASE_URL}/health`);
  return res.json();
}

export async function analyze(data: any) {
  const res = await fetch(`${BASE_URL}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Analysis failed");
  return res.json();
}

async function postJson<T>(path: string, payload: object): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await response.json()) as T | { error?: string };
  if (!response.ok) {
    const message = typeof body === "object" && body && "error" in body ? body.error : "API request failed";
    throw new Error(message || "API request failed");
  }
  return body as T;
}

export function analyzeDataset(payload: AnalyzePayload) {
  return postJson<AnalyzeResponse>("/analyze", payload);
}

export function mitigateBias(payload: AnalyzePayload) {
  return postJson<MitigateResponse>("/mitigate", payload);
}
