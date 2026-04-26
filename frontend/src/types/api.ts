export interface AnalyzeResponse {
  summary: {
    bias_score: number;
    risk_level: "low" | "medium" | "high";
    bias_detected: boolean;
    rows_analyzed: number;
    columns_analyzed: number;
  };
  metrics: {
    statistical_parity: number;
    equal_opportunity: number;
    disparate_impact: number;
  };
  top_features: Array<{ feature: string; impact: number }>;
  recommendations: string[];
  attribute_metrics: Array<{
    attribute: string;
    statistical_parity: number;
    equal_opportunity: number;
    disparate_impact: number;
    bias_detected: boolean;
    privileged_group: string;
  }>;
  explanation: string;
}

export interface MitigateResponse {
  method: "reweighing";
  before: {
    summary: {
      bias_score: number;
      risk_level: "low" | "medium" | "high";
      bias_detected: boolean;
    };
    metrics: {
      statistical_parity: number;
      equal_opportunity: number;
      disparate_impact: number;
    };
  };
  after: {
    summary: {
      bias_score: number;
      risk_level: "low" | "medium" | "high";
      bias_detected: boolean;
    };
    metrics: {
      statistical_parity: number;
      equal_opportunity: number;
      disparate_impact: number;
    };
  };
  improved: boolean;
}
