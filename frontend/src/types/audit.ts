export type Severity = "critical" | "high" | "moderate" | "minor" | "fair";

export interface AttributeMetrics {
  disparateImpact: number;
  statParityDiff: number;
  equalOpportunityDiff: number;
  averageOddsDiff: number;
  theilIndex: number;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  effort: "low" | "medium" | "high";
  beforeScore: number;
  afterScore: number;
}

export interface DistributionPoint {
  group: string;
  rate: number;
}

export interface HeatmapCell {
  attribute: string;
  metric: string;
  value: number;
}

export interface ProxyVariable {
  feature: string;
  protectedAttribute: string;
  correlation: number;
}

export interface IntersectionalPoint {
  group: string;
  score: number;
}

export interface Audit {
  id: string;
  datasetName: string;
  createdAt: string;
  rowCount: number;
  columnCount: number;
  fairnessScore: number;
  severity: Severity;
  metrics: Record<string, AttributeMetrics>;
  protectedAttributes: string[];
  aiNarrative: string;
  recommendations: Recommendation[];
  distributions: DistributionPoint[];
  heatmap: HeatmapCell[];
  proxyVariables: ProxyVariable[];
  intersectional: IntersectionalPoint[];
}
