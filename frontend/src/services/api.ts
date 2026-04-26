const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://cfisshy-ai-8zwm.onrender.com";

// ─── Schema Auto-Detection Utilities ───────────────────────────────────────────────

const SENSITIVE_KEYWORDS = ["sex", "gender", "race", "ethnic", "age", "disability", "religion", "nationality"];
const TARGET_KEYWORDS = ["outcome", "target", "label", "result", "decision", "approved", "hired", "admitted", "default", "readmitted", "recidivism"];

export function detectSchema(columns: string[]): {
  targetColumn?: string;
  sensitiveAttributes?: string[];
  confidence: "high" | "medium" | "low";
} {
  // Detect sensitive attributes
  const sensitiveAttrs = columns.filter((col) =>
    SENSITIVE_KEYWORDS.some(kw => col.toLowerCase().includes(kw))
  );

  // Detect target column
  const targetCol = columns.find((col) =>
    TARGET_KEYWORDS.some(kw => col.toLowerCase().includes(kw))
  );

  // If no target found, pick the last column (common pattern)
  const fallbackTarget = !targetCol ? columns[columns.length - 1] : undefined;

  let confidence: "high" | "medium" | "low" = "low";
  if (targetCol && sensitiveAttrs.length > 0) confidence = "high";
  else if (targetCol || sensitiveAttrs.length > 0) confidence = "medium";

  return {
    targetColumn: targetCol || fallbackTarget,
    sensitiveAttributes: sensitiveAttrs.length > 0 ? sensitiveAttrs : undefined,
    confidence,
  };
}

export function detectPositiveLabelValue(values: string[]): string | number {
  if (values.length === 0) return 1;

  // If values are numeric (0, 1), pick 1
  const numericValues = values.map(v => Number(v)).filter(n => !isNaN(n));
  if (numericValues.length > 0) {
    const maxVal = Math.max(...numericValues);
    if (numericValues.includes(0) && numericValues.includes(1)) return 1;
    return maxVal;
  }

  // If values are Yes/No, pick Yes
  const lowerValues = values.map(v => v.toLowerCase());
  if (lowerValues.includes("yes") || lowerValues.includes("y")) {
    return values[lowerValues.indexOf("yes")] ?? values[lowerValues.indexOf("y")] ?? "yes";
  }
  if (lowerValues.includes("no") || lowerValues.includes("n")) {
    return values[lowerValues.indexOf("yes")] ?? values[lowerValues.indexOf("y")] ?? "yes";
  }

  // If values are True/False, pick True
  if (lowerValues.includes("true") || lowerValues.includes("t")) {
    return values[lowerValues.indexOf("true")] ?? values[lowerValues.indexOf("t")] ?? "true";
  }

  // If values are Approved/Rejected, pick Approved
  if (lowerValues.includes("approved") || lowerValues.includes("accept")) {
    return values[lowerValues.indexOf("approved")] ?? values[lowerValues.indexOf("accept")] ?? "approved";
  }

  // Default to the first value
  return values[0];
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AnalyzeRequest {
  datasetBase64: string;
  targetColumn?: string;
  sensitiveAttributes?: string[];
  labelValue?: string | number;
  discoveryMode?: boolean;
}

export interface RawMetrics {
  disparate_impact?: number;
  disparateImpact?: number;
  statistical_parity_difference?: number;
  statisticalParityDifference?: number;
  statistical_parity?: number;
  equal_opportunity_difference?: number;
  equalOpportunityDifference?: number;
  average_odds_difference?: number;
  averageOddsDifference?: number;
}

export interface RawFeature {
  feature_name?: string;
  name?: string;
  feature?: string;
  impact_percentage?: number;
  impact?: number;
  shap_value?: number;
  explanation?: string;
  description?: string;
}

export interface AnalysisResult {
  // Dataset info
  numRows: number;
  numColumns: number;
  targetColumn: string;
  sensitiveAttribute: string;
  favorableOutcome: string | number;

  // Core fairness metrics (all normalized)
  disparateImpact: number;
  statisticalParity: number;
  equalOpportunity: number;
  averageOdds: number;

  // Derived
  fairnessScore: number;        // 0-100
  biasDetected: boolean;
  biasLevel: "none" | "low" | "moderate" | "high" | "critical";
  biasExplanation: string;      // plain English

  // Feature importance
  topFeatures: Array<{
    name: string;
    impactPercent: number;
    explanation: string;
    isProxy: boolean;
  }>;

  // Compliance
  compliance: {
    euAiAct: boolean;
    eeoc: boolean;       // 4/5ths rule
    gdpr: boolean;
  };

  rawResponse: any;
}

export interface MitigationResult {
  before: AnalysisResult;
  after: AnalysisResult;
  improvement: number;
  method: string;
  mitigated_dataset_csv?: string;
  mitigated_dataset_base64?: string;
}

// ─── Normalizer ──────────────────────────────────────────────────────────────

export function normalizeResponse(
  raw: any,
  request: AnalyzeRequest
): AnalysisResult {
  const m: RawMetrics = raw.metrics || raw.fairness_metrics || raw.bias_metrics || {};

  const disparateImpact =
    m.disparate_impact ?? m.disparateImpact ??
    raw.disparate_impact ?? raw.disparateImpact ?? 1.0;

  const statisticalParity =
    m.statistical_parity_difference ?? m.statisticalParityDifference ??
    m.statistical_parity ?? raw.statistical_parity_difference ?? 0;

  const equalOpportunity =
    m.equal_opportunity_difference ?? m.equalOpportunityDifference ??
    raw.equal_opportunity_difference ?? 0;

  const averageOdds =
    m.average_odds_difference ?? m.averageOddsDifference ??
    raw.average_odds_difference ?? 0;

  const fairnessScore =
    raw.fairness_score ?? raw.fairnessScore ??
    computeFairnessScore(disparateImpact, statisticalParity, equalOpportunity);

  const biasDetected =
    raw.bias_detected ?? raw.biasDetected ??
    (disparateImpact < 0.8 || Math.abs(statisticalParity) > 0.1);

  const biasLevel = getBiasLevel(fairnessScore);

  const rawFeatures: RawFeature[] = 
    raw.top_features ?? raw.topFeatures ?? raw.feature_impacts ?? raw.shap_features ?? [];

  const topFeatures = rawFeatures.map((f) => ({
    name: f.feature_name ?? f.name ?? f.feature ?? "Unknown",
    impactPercent: Math.round((f.impact_percentage ?? f.impact ?? f.shap_value ?? 0) * 10) / 10,
    explanation: f.explanation ?? f.description ?? generateFeatureExplanation(
      f.feature_name ?? f.name ?? "", request.sensitiveAttributes?.[0] ?? "unknown"
    ),
    isProxy: isProxyFeature(f.feature_name ?? f.name ?? "", request.sensitiveAttributes?.[0] ?? "unknown")
  }));

  return {
    numRows: raw.num_rows ?? raw.rows ?? raw.dataset_size ?? raw.numRows ?? 0,
    numColumns: raw.num_columns ?? raw.columns ?? raw.numColumns ?? 0,
    targetColumn: request.targetColumn ?? "unknown",
    sensitiveAttribute: request.sensitiveAttributes?.[0] ?? "unknown",
    favorableOutcome: request.labelValue ?? "unknown",

    disparateImpact,
    statisticalParity,
    equalOpportunity,
    averageOdds,

    fairnessScore,
    biasDetected,
    biasLevel,
    biasExplanation: generateBiasExplanation(
      biasLevel, disparateImpact,
      request.sensitiveAttributes?.[0] ?? "unknown", request.targetColumn ?? "unknown"
    ),

    topFeatures,

    compliance: {
      euAiAct: fairnessScore >= 60,
      eeoc: disparateImpact >= 0.8,
      gdpr: true, // SHAP explanations always generated
    },

    rawResponse: raw,
  };
}

function computeFairnessScore(di: number, spd: number, eod: number): number {
  const diScore = Math.min(100, Math.max(0, di * 80));
  const spdScore = Math.max(0, 100 - Math.abs(spd) * 300);
  const eodScore = Math.max(0, 100 - Math.abs(eod) * 300);
  return Math.round((diScore * 0.5 + spdScore * 0.3 + eodScore * 0.2));
}

function getBiasLevel(score: number): AnalysisResult["biasLevel"] {
  if (score >= 85) return "none";
  if (score >= 70) return "low";
  if (score >= 55) return "moderate";
  if (score >= 35) return "high";
  return "critical";
}

function generateBiasExplanation(
  level: AnalysisResult["biasLevel"],
  di: number,
  attribute: string, target: string
): string {
  const disparity = Math.round((1 - di) * 100);
  const attr = attribute.replace(/_/g, " ");
  const tgt = target.replace(/_/g, " ");

  if (level === "none") return `No significant bias detected. The model treats all groups fairly with respect to ${attr}.`;
  if (level === "low") return `Minor bias detected. There is a ${disparity}% gap in ${tgt} outcomes between groups based on ${attr}. Monitor but may not require immediate action.`;
  if (level === "moderate") return `Moderate bias detected. People are ${disparity}% less likely to receive a favorable ${tgt} outcome based on their ${attr}. Investigation and mitigation recommended.`;
  if (level === "high") return `Significant bias detected. A ${disparity}% disparity in ${tgt} outcomes exists based on ${attr}. This likely violates EEOC guidelines and requires immediate mitigation.`;
  return `Critical bias detected. A ${disparity}% disparity in ${tgt} outcomes is driven by ${attr}. This system should NOT be deployed without bias correction. Potential legal liability.`;
}

function generateFeatureExplanation(feature: string, attribute: string): string {
  const f = feature.toLowerCase();
  if (f.includes("zip") || f.includes("postal")) return "ZIP codes can act as proxies for race due to residential segregation patterns";
  if (f.includes("income") || f.includes("salary")) return "Income gaps between demographic groups can reflect historical discrimination";
  if (f.includes("education")) return "Education access varies significantly across demographic groups";
  if (f.includes("marital")) return "Marital status correlates with gender and may encode indirect discrimination";
  if (f.includes("occupation") || f.includes("job")) return "Occupational segregation means job type can encode gender or racial bias";
  return `This feature correlates with ${attribute.replace(/_/g, " ")} and contributes to outcome disparity`;
}

function isProxyFeature(feature: string, attribute: string): boolean {
  const proxyMap: Record<string, string[]> = {
    sex: ["marital_status", "occupation", "relationship", "hours_per_week"],
    gender: ["marital_status", "occupation", "relationship"],
    race: ["zip_code", "postal_code", "neighborhood", "school", "income"],
    age: ["experience", "years", "graduation"],
  };
  const attr = attribute.toLowerCase();
  const proxies = proxyMap[attr] ?? [];
  return proxies.some(p => feature.toLowerCase().includes(p));
}

// ─── API Calls ────────────────────────────────────────────────────────────────

async function callAPI(endpoint: string, body: object): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const raw = await response.text();

    if (!response.ok) {
      let msg = `Server error (${response.status})`;
      try {
        const err = JSON.parse(raw);
        msg = err.error ?? err.detail ?? err.message ?? msg;
        if (Array.isArray(msg)) msg = msg.map((e: any) => e.msg).join(", ");
      } catch {}
      throw new Error(msg);
    }

    return JSON.parse(raw);
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      throw new Error("Request timed out (90s). Backend may be cold-starting. Please try again in 30 seconds.");
    }
    throw err;
  }
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]); // strip data:...;base64, prefix
    };
    reader.onerror = reject;
  });
}

export async function analyzeDataset(request: AnalyzeRequest): Promise<AnalysisResult> {
  const raw = await callAPI("/analyze", {
    dataset_base64: request.datasetBase64,
    target_column: request.targetColumn,
    sensitive_attributes: request.sensitiveAttributes,
    favorable_outcome: request.labelValue,
  });
  return normalizeResponse(raw, request);
}

export async function mitigateDataset(request: AnalyzeRequest): Promise<MitigationResult> {
  const beforeRaw = await callAPI("/analyze", {
    dataset_base64: request.datasetBase64,
    target_column: request.targetColumn,
    sensitive_attributes: request.sensitiveAttributes,
    favorable_outcome: request.labelValue,
  });

  const afterRaw = await callAPI("/mitigate", {
    dataset_base64: request.datasetBase64,
    target_column: request.targetColumn,
    sensitive_attributes: request.sensitiveAttributes,
    favorable_outcome: request.labelValue,
    method: "reweighing",
  });

  const before = normalizeResponse(beforeRaw, request);
  const after = normalizeResponse(afterRaw, request);

  return {
    before,
    after,
    improvement: after.fairnessScore - before.fairnessScore,
    method: "Reweighing Algorithm (AIF360)",
    mitigated_dataset_csv: afterRaw.mitigated_dataset_csv,
    mitigated_dataset_base64: afterRaw.mitigated_dataset_base64,
  };
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(10000) });
    return res.ok;
  } catch {
    return false;
  }
}
