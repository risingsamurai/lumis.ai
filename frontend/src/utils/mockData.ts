import type { Audit } from "../types/audit";

export const demoAudit: Audit = {
  id: "demo-lending",
  datasetName: "LendSmart Lending Dataset",
  createdAt: new Date().toISOString(),
  rowCount: 23450,
  columnCount: 18,
  fairnessScore: 68,
  severity: "moderate",
  protectedAttributes: ["gender", "race"],
  aiNarrative:
    "Gender and race both show measurable disparities in approval outcomes. Female applicants and Black applicants have reduced favorable outcomes relative to reference groups. This pattern can create material harm in lending access and potentially trigger compliance risks under fair lending standards.",
  metrics: {
    gender: {
      disparateImpact: 0.64,
      statParityDiff: -0.18,
      equalOpportunityDiff: -0.13,
      averageOddsDiff: -0.12,
      theilIndex: 0.31
    },
    race: {
      disparateImpact: 0.71,
      statParityDiff: -0.14,
      equalOpportunityDiff: -0.11,
      averageOddsDiff: -0.09,
      theilIndex: 0.22
    }
  },
  recommendations: [
    {
      id: "rw",
      title: "Apply Reweighing Algorithm",
      description: "Rebalance training weights to reduce historical skew for protected groups.",
      effort: "low",
      beforeScore: 68,
      afterScore: 79
    },
    {
      id: "ceo",
      title: "Use Calibrated Equalized Odds",
      description: "Adjust post-processing thresholds to align false positive/negative rates.",
      effort: "medium",
      beforeScore: 68,
      afterScore: 84
    }
  ],
  distributions: [
    { group: "Male", rate: 73 },
    { group: "Female", rate: 51 },
    { group: "White", rate: 69 },
    { group: "Black", rate: 48 }
  ],
  heatmap: [
    { attribute: "gender", metric: "disparateImpact", value: 0.64 },
    { attribute: "gender", metric: "statParityDiff", value: -0.18 },
    { attribute: "gender", metric: "equalOpportunityDiff", value: -0.13 },
    { attribute: "race", metric: "disparateImpact", value: 0.71 },
    { attribute: "race", metric: "statParityDiff", value: -0.14 },
    { attribute: "race", metric: "averageOddsDiff", value: -0.09 }
  ],
  proxyVariables: [
    { feature: "zipcode", protectedAttribute: "race", correlation: 0.87 },
    { feature: "employment_gap_months", protectedAttribute: "gender", correlation: 0.54 }
  ],
  intersectional: [
    { group: "Black Women", score: 41 },
    { group: "White Men", score: 74 },
    { group: "Latina Women", score: 49 },
    { group: "Asian Men", score: 68 }
  ]
};
