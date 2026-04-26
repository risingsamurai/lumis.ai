import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");

export interface BiasReportInput {
  datasetName: string;
  fairnessScore: number;
  protectedAttribute: string;
  disparateImpact: number;
  statisticalParity: number;
  topFeatures: Array<{ name: string; impact: number }>;
  mitigationApplied: boolean;
}

export async function generateAuditNarrative(input: BiasReportInput): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return "Gemini API key not configured. Please check your .env file in the frontend folder.";
  }

  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `You are an AI fairness auditor. Write a concise, professional 3-paragraph audit narrative for the following bias analysis results. Be specific, use the numbers provided, and end with 2 actionable recommendations. Keep it under 200 words.

Dataset: ${input.datasetName}
Protected Attribute: ${input.protectedAttribute}
Overall Fairness Score: ${input.fairnessScore}/100
Disparate Impact Ratio: ${input.disparateImpact} (below 0.8 indicates bias)
Statistical Parity Difference: ${input.statisticalParity}
Top bias-contributing features: ${input.topFeatures.map(f => `${f.name} (${f.impact}% impact)`).join(", ")}
Mitigation Applied: ${input.mitigationApplied ? "Yes — reweighing algorithm" : "No"}

Write in plain English for a non-technical HR manager or compliance officer.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

export interface MitigationExplanationInput {
  beforeFairnessScore: number;
  afterFairnessScore: number;
  beforeDisparateImpact: number;
  afterDisparateImpact: number;
  beforeStatisticalParity: number;
  afterStatisticalParity: number;
  protectedAttribute: string;
  improvement: number;
}

export async function generateMitigationExplanation(input: MitigationExplanationInput): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return "Gemini API key not configured. Please check your .env file in the frontend folder.";
  }

  // Handle nulls or empty metrics with safe defaults
  const beforeFairnessScore = input.beforeFairnessScore ?? 0;
  const afterFairnessScore = input.afterFairnessScore ?? 0;
  const beforeDisparateImpact = input.beforeDisparateImpact ?? 0;
  const afterDisparateImpact = input.afterDisparateImpact ?? 0;
  const beforeStatisticalParity = input.beforeStatisticalParity ?? 0;
  const afterStatisticalParity = input.afterStatisticalParity ?? 0;
  const improvement = input.improvement ?? 0;

  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `You are an AI fairness expert. Explain the results of applying the Reweighing bias mitigation algorithm in 3-4 concise bullet points. Use the specific numbers provided. Keep it under 150 words.

Before Mitigation:
- Fairness Score: ${beforeFairnessScore}/100
- Disparate Impact: ${beforeDisparateImpact}
- Statistical Parity: ${beforeStatisticalParity}

After Mitigation:
- Fairness Score: ${afterFairnessScore}/100
- Disparate Impact: ${afterDisparateImpact}
- Statistical Parity: ${afterStatisticalParity}

Protected Attribute: ${input.protectedAttribute}
Overall Improvement: +${improvement} points

IMPORTANT: End your response with two specific sections:
1. **Verdict:** A clear statement about whether the model is now safe for deployment (e.g., "This model is now safe for deployment" or "This model requires further improvement")
2. **Legal Note:** A compliance statement referencing the 80% rule for Disparate Impact (e.g., "Complies with 80% rule for Disparate Impact" or "Does not comply with 80% rule for Disparate Impact")

Explain what changed and why the model is now fairer. Write in plain English for a non-technical audience.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    // Friendly fallback message
    return `The Reweighing algorithm improved fairness by +${improvement} points. Disparate Impact changed from ${beforeDisparateImpact} to ${afterDisparateImpact}. ${afterDisparateImpact >= 0.8 ? "The model now complies with the 80% rule and is safer for deployment." : "The model requires further improvement to meet compliance standards."}`;
  }
}
