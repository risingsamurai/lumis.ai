import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BiasReportInput {
  datasetName: string;
  fairnessScore: number;
  protectedAttribute: string;
  disparateImpact: number;
  statisticalParity: number;
  topFeatures: Array<{ name: string; impact: number }>;
  mitigationApplied: boolean;
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

// ─── Feature name cleaner ─────────────────────────────────────────────────────

export function cleanFeatureName(name: string): string {
  return name
    .replace(/^numeric__/, "")
    .replace(/^categorical__/, "")
    .replace(/^onehot__/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

// ─── Local fallback explanation generators ────────────────────────────────────

function generateLocalAuditNarrative(input: BiasReportInput): string {
  const { fairnessScore, protectedAttribute, disparateImpact, statisticalParity, topFeatures } = input;
  const di = disparateImpact ?? 1;
  const sp = Math.abs(statisticalParity ?? 0);
  const attr = protectedAttribute || "the protected attribute";

  const scoreVerdict =
    fairnessScore >= 85 ? "This model treats all groups fairly." :
      fairnessScore >= 70 ? "Minor bias detected — monitor regularly." :
        fairnessScore >= 55 ? "Moderate bias detected — mitigation recommended." :
          fairnessScore >= 35 ? "Significant bias detected — immediate action required." :
            "Critical bias — this model should NOT be deployed without correction.";

  let out = `**Fairness Score: ${fairnessScore}/100** — ${scoreVerdict}\n\n`;

  if (di < 0.8 || sp > 0.1) {
    out += `**Where is the bias?**\n`;
    out += `People are being treated differently based on **${attr}**. `;
    if (di < 0.8) {
      out += `The Disparate Impact ratio is **${di.toFixed(2)}** — below the legal threshold of 0.80 (EEOC 4/5ths rule). `;
      out += `One group is ${Math.round(100 / Math.max(di, 0.01) - 100)}% less likely to receive a favorable outcome.\n\n`;
    }
    if (sp > 0.1) {
      out += `The Statistical Parity Difference is **${sp.toFixed(3)}** — above the acceptable threshold of 0.10, confirming systematic group-level outcome differences.\n\n`;
    }
  }

  if (topFeatures.length > 0) {
    out += `**Primary Bias Drivers:**\n`;
    topFeatures.slice(0, 3).forEach((f, i) => {
      const clean = cleanFeatureName(f.name);
      out += `${i + 1}. **${clean}** (${f.impact}% impact)\n`;
    });
    out += `\n`;
  }

  out += `**Recommendation:** `;
  out += di < 0.8
    ? `Apply the Reweighing mitigation (available below) to bring Disparate Impact above 0.80 and achieve EEOC compliance.`
    : `Continue monitoring fairness metrics as data distributions shift over time.`;

  return out;
}

function generateLocalMitigationExplanation(input: MitigationExplanationInput): string {
  const {
    beforeFairnessScore, afterFairnessScore,
    beforeDisparateImpact, afterDisparateImpact,
    beforeStatisticalParity, afterStatisticalParity,
    protectedAttribute, improvement,
  } = input;

  const improved = improvement > 0;
  const diCompliant = afterDisparateImpact >= 0.8;
  const attr = protectedAttribute || "the protected attribute";

  let out = `**Reweighing Mitigation Results**\n\n`;
  out += `• Fairness Score: **${beforeFairnessScore.toFixed(1)} → ${afterFairnessScore.toFixed(1)}** (${improved ? "+" : ""}${improvement.toFixed(1)} points)\n`;
  out += `• Disparate Impact: **${beforeDisparateImpact.toFixed(3)} → ${afterDisparateImpact.toFixed(3)}** ${diCompliant ? "✅ Now compliant with EEOC 4/5ths rule" : "⚠️ Still below 0.80 threshold"}\n`;
  out += `• Statistical Parity: **${beforeStatisticalParity.toFixed(3)} → ${afterStatisticalParity.toFixed(3)}**\n\n`;

  out += `The Reweighing algorithm assigned higher training weights to underrepresented positive cases in **${attr}**, `;
  out += `reducing the model's learned bias without altering the original dataset.\n\n`;

  out += `**Verdict:** `;
  out += diCompliant
    ? `This model is now safer for deployment — Disparate Impact meets the legal 0.80 threshold.`
    : `Further improvement is needed — Disparate Impact is still below 0.80. Consider reviewing the top bias-contributing features.`;

  return out;
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function generateAuditNarrative(input: BiasReportInput): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey === "your_key_here") {
    return generateLocalAuditNarrative(input);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an AI fairness auditor. Write a concise, professional 3-paragraph audit narrative for the following bias analysis results. Be specific, use the numbers provided, and end with 2 actionable recommendations. Keep it under 200 words.

Dataset: ${input.datasetName}
Protected Attribute: ${input.protectedAttribute}
Overall Fairness Score: ${input.fairnessScore}/100
Disparate Impact Ratio: ${input.disparateImpact} (below 0.8 indicates bias)
Statistical Parity Difference: ${input.statisticalParity}
Top bias-contributing features: ${input.topFeatures.map(f => `${cleanFeatureName(f.name)} (${f.impact}% impact)`).join(", ")}
Mitigation Applied: ${input.mitigationApplied ? "Yes — reweighing algorithm" : "No"}

Write in plain English for a non-technical HR manager or compliance officer.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    return generateLocalAuditNarrative(input);
  }
}

export async function generateMitigationExplanation(input: MitigationExplanationInput): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  const safeInput = {
    beforeFairnessScore: input.beforeFairnessScore ?? 0,
    afterFairnessScore: input.afterFairnessScore ?? 0,
    beforeDisparateImpact: input.beforeDisparateImpact ?? 0,
    afterDisparateImpact: input.afterDisparateImpact ?? 0,
    beforeStatisticalParity: input.beforeStatisticalParity ?? 0,
    afterStatisticalParity: input.afterStatisticalParity ?? 0,
    improvement: input.improvement ?? 0,
    protectedAttribute: input.protectedAttribute,
  };

  if (!apiKey || apiKey === "your_key_here") {
    return generateLocalMitigationExplanation(safeInput);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an AI fairness expert. Explain the results of applying the Reweighing bias mitigation algorithm in 3-4 concise bullet points. Use the specific numbers provided. Keep it under 150 words.

Before Mitigation:
- Fairness Score: ${safeInput.beforeFairnessScore}/100
- Disparate Impact: ${safeInput.beforeDisparateImpact}
- Statistical Parity: ${safeInput.beforeStatisticalParity}

After Mitigation:
- Fairness Score: ${safeInput.afterFairnessScore}/100
- Disparate Impact: ${safeInput.afterDisparateImpact}
- Statistical Parity: ${safeInput.afterStatisticalParity}

Protected Attribute: ${safeInput.protectedAttribute}
Overall Improvement: +${safeInput.improvement} points

IMPORTANT: End with:
1. **Verdict:** Safe for deployment or requires further improvement.
2. **Legal Note:** EEOC 80% rule compliance status.

Write in plain English for a non-technical audience.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    return generateLocalMitigationExplanation(safeInput);
  }
}
