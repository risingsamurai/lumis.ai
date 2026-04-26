export interface NormalizedAnalysisResult {
  rows: number;
  columns: number;
  biasDetected: boolean;
  fairnessScore: number;
  statisticalParity: number;
  equalOpportunity: number;
  disparateImpact: number;
  averageOdds: number;
  topFeatures: Array<{ name: string; impact: number; explanation: string }>;
  mitigationAvailable: boolean;
  rawResponse: any;
}

export function normalizeAnalysisResponse(raw: any): NormalizedAnalysisResult {
  console.log("Normalizing response:", raw);
  
  // Handle both snake_case and camelCase from backend
  const metrics = raw.metrics || raw.fairness_metrics || raw.bias_metrics || {};
  
  const disparateImpact = 
    metrics.disparate_impact ?? 
    metrics.disparateImpact ?? 
    raw.disparate_impact ?? 
    raw.disparateImpact ?? 
    1.0;

  const statisticalParity = 
    metrics.statistical_parity_difference ?? 
    metrics.statisticalParityDifference ?? 
    metrics.statistical_parity ??
    raw.statistical_parity_difference ?? 
    0;

  const equalOpportunity = 
    metrics.equal_opportunity_difference ?? 
    metrics.equalOpportunityDifference ??
    metrics.equal_opportunity ??
    raw.equal_opportunity_difference ?? 
    0;

  // Bias is detected if disparate impact is below 0.8 OR statistical parity > 0.1
  const biasDetected = disparateImpact < 0.8 || Math.abs(statisticalParity) > 0.1;

  // Fairness score: 0-100 derived from metrics
  const fairnessScore = raw.fairness_score ?? 
    raw.fairnessScore ?? 
    Math.round(Math.min(100, Math.max(0, 
      (disparateImpact * 50) + (1 - Math.abs(statisticalParity)) * 30 + 20
    )));

  // Dataset shape
  const rows = raw.num_rows ?? raw.rows ?? raw.dataset_size ?? raw.numRows ?? raw.rows_analyzed ?? 0;
  const columns = raw.num_columns ?? raw.columns ?? raw.num_features ?? raw.numColumns ?? raw.columns_analyzed ?? 0;

  // Top features from SHAP
  const topFeatures = (
    raw.top_features ?? 
    raw.topFeatures ?? 
    raw.feature_impacts ??
    raw.shap_features ??
    []
  ).map((f: any) => ({
    name: f.feature_name ?? f.name ?? f.feature ?? "Unknown",
    impact: Math.round((f.impact_percentage ?? f.impact ?? f.shap_value ?? 0) * 100) / 100,
    explanation: f.explanation ?? f.description ?? ""
  }));

  return {
    rows,
    columns,
    biasDetected,
    fairnessScore,
    statisticalParity,
    equalOpportunity,
    disparateImpact,
    averageOdds: metrics.average_odds_difference ?? metrics.averageOddsDifference ?? 0,
    topFeatures,
    mitigationAvailable: true,
    rawResponse: raw
  };
}
