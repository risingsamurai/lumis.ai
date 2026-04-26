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
