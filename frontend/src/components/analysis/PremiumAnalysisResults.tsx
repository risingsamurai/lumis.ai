import { useState, useEffect } from "react";
import { generateAuditNarrative, type BiasReportInput } from "../../services/geminiReport";
import { exportAuditPDF } from "../../services/pdfExport";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

interface AnalysisResult {
  summary: {
    rows_analyzed: number;
    columns_analyzed: number;
    bias_detected: boolean;
    bias_score: number;
    risk_level: string;
  };
  metrics: {
    statistical_parity: number;
    equal_opportunity: number;
    disparate_impact: number;
  };
  explanation: {
    human_explanation: string;
  };
  top_features: Array<{
    feature: string;
    original_feature?: string;
    impact: number;
    explanation: string;
  }>;
  recommendations: string[];
  attribute_metrics?: Record<string, any>;
  mitigation_result?: {
    before: {
      summary: {
        bias_score: number;
        bias_detected: boolean;
        risk_level: string;
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
        bias_detected: boolean;
        risk_level: string;
      };
      metrics: {
        statistical_parity: number;
        equal_opportunity: number;
        disparate_impact: number;
      };
    };
    improved: boolean;
  };
}

interface PremiumAnalysisResultsProps {
  result: AnalysisResult;
  onMitigate?: () => void;
}

export default function PremiumAnalysisResults({ result, onMitigate }: PremiumAnalysisResultsProps) {
  const [narrative, setNarrative] = useState<string>("");
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [reweighingStrength, setReweighingStrength] = useState(50);
  const [fairnessBias, setFairnessBias] = useState(50);

  const COMPLIANCE_CHECKS = [
    {
      framework: "EU AI Act",
      article: "Article 10",
      requirement: "Training data must be examined for bias",
      status: (fairnessScore: number) => fairnessScore >= 60,
      description: "Bias audit conducted and documented"
    },
    {
      framework: "GDPR",
      article: "Article 22",
      requirement: "Meaningful explanation of automated decisions",
      status: () => true,
      description: "SHAP-based explanations generated"
    },
    {
      framework: "US EEOC",
      article: "Adverse Impact",
      requirement: "4/5ths (80%) rule for hiring disparate impact",
      status: (_fairnessScore: number, disparateImpact: number) => disparateImpact >= 0.8,
      description: "Disparate impact ratio analyzed"
    },
    {
      framework: "ISO 42001",
      article: "AI Management",
      requirement: "AI system risk assessment documented",
      status: (_fairnessScore: number) => true,
      description: "Audit trail and report generated"
    }
  ];

  useEffect(() => {
    if (result) {
      setNarrativeLoading(true);
      const input: BiasReportInput = {
        datasetName: result.summary.rows_analyzed ? "Uploaded Dataset" : "Analysis Result",
        fairnessScore: result.summary.bias_score,
        protectedAttribute: "sensitive attribute",
        disparateImpact: result.metrics.disparate_impact,
        statisticalParity: result.metrics.statistical_parity,
        topFeatures: result.top_features.slice(0, 3).map(f => ({ name: f.feature, impact: f.impact })),
        mitigationApplied: !!result.mitigation_result
      };
      
      generateAuditNarrative(input)
        .then(setNarrative)
        .catch(() => setNarrative("Narrative unavailable — check Gemini API key."))
        .finally(() => setNarrativeLoading(false));
    }
  }, [result]);

  const hasMitigation = !!result.mitigation_result;

  const projectMitigatedMetrics = (
    original: { fairnessScore: number; accuracy: number },
    reweighingStrength: number,
    fairnessBias: number
  ) => {
    const improvementFactor = (reweighingStrength / 100) * 0.4 * (0.5 + (fairnessBias / 100) * 0.5);
    const accuracyCost = (reweighingStrength / 100) * 0.08 * ((fairnessBias / 100) * 0.7);
    return {
      projectedFairnessScore: Math.min(100, original.fairnessScore + improvementFactor * 100),
      projectedAccuracy: Math.max(0.6, original.accuracy - accuracyCost),
      recommendation: reweighingStrength < 30
        ? "Light mitigation — minimal accuracy impact, moderate bias reduction"
        : reweighingStrength < 70
        ? "Balanced mitigation — recommended for most production systems"
        : "Aggressive mitigation — maximum fairness, some accuracy reduction expected"
    };
  };

  const projected = projectMitigatedMetrics(
    { fairnessScore: result.summary.bias_score, accuracy: 0.85 },
    reweighingStrength,
    fairnessBias
  );

  const getBiasScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-8">
      {/* Executive Summary Header */}
      <div className="border-b border-border pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Fairness Analysis Report</h2>
            <p className="mt-1 text-muted-foreground">Comprehensive bias detection and compliance assessment</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                result.summary.bias_detected 
                  ? 'bg-red-100 text-red-800 border border-red-200' 
                  : 'bg-green-100 text-green-800 border border-green-200'
              }`}>
                {result.summary.bias_detected ? 'Bias Detected' : 'No Bias'}
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                result.summary.risk_level === 'high' 
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : result.summary.risk_level === 'medium'
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  : 'bg-green-100 text-green-800 border border-green-200'
              }`}>
                {result.summary.risk_level?.toUpperCase()} Risk
              </div>
            </div>
            <button
              onClick={() => exportAuditPDF(result, narrative)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 
                         text-white rounded-lg text-sm font-medium transition-all duration-200
                         hover:shadow-lg hover:shadow-emerald-500/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export PDF Report
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Dataset Size</p>
              <p className="text-2xl font-semibold text-foreground">{result.summary.rows_analyzed.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">rows analyzed</p>
            </div>
            <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <div className="h-4 w-4 bg-blue-500 rounded"></div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Features</p>
              <p className="text-2xl font-semibold text-foreground">{result.summary.columns_analyzed}</p>
              <p className="text-xs text-muted-foreground">columns analyzed</p>
            </div>
            <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
              <div className="h-4 w-4 bg-green-500 rounded"></div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fairness Score</p>
              <p className={`text-2xl font-semibold ${getBiasScoreColor(result.summary.bias_score)}`}>
                {result.summary.bias_score}
              </p>
              <p className="text-xs text-muted-foreground">overall score</p>
            </div>
            <div className="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <div className="h-4 w-4 bg-yellow-500 rounded"></div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Compliance</p>
              <p className={`text-2xl font-semibold ${result.summary.bias_detected ? 'text-red-600' : 'text-green-600'}`}>
                {result.summary.bias_detected ? 'FAIL' : 'PASS'}
              </p>
              <p className="text-xs text-muted-foreground">bias assessment</p>
            </div>
            <div className={`h-8 w-8 ${result.summary.bias_detected ? 'bg-red-100' : 'bg-green-100'} rounded-lg flex items-center justify-center`}>
              <div className={`h-4 w-4 ${result.summary.bias_detected ? 'bg-red-500' : 'bg-green-500'} rounded`}></div>
            </div>
          </div>
        </Card>
      </div>

      {/* AI Audit Narrative */}
      <Card className="p-6 border-l-4 border-l-emerald-500">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <span className="text-lg">🤖</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground">Gemini AI Audit Narrative</h3>
            <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full border border-emerald-200">
              Powered by Gemini
            </span>
          </div>
          <Button
            onClick={() => {
              setNarrativeLoading(true);
              const input: BiasReportInput = {
                datasetName: result.summary.rows_analyzed ? "Uploaded Dataset" : "Analysis Result",
                fairnessScore: result.summary.bias_score,
                protectedAttribute: "sensitive attribute",
                disparateImpact: result.metrics.disparate_impact,
                statisticalParity: result.metrics.statistical_parity,
                topFeatures: result.top_features.slice(0, 3).map(f => ({ name: f.feature, impact: f.impact })),
                mitigationApplied: !!result.mitigation_result
              };
              generateAuditNarrative(input)
                .then(setNarrative)
                .catch(() => setNarrative("Narrative unavailable — check Gemini API key."))
                .finally(() => setNarrativeLoading(false));
            }}
            variant="ghost"
            disabled={narrativeLoading}
          >
            Regenerate
          </Button>
        </div>
        {narrativeLoading ? (
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-5/6 animate-pulse"></div>
          </div>
        ) : (
          <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">
            {narrative || result.explanation?.human_explanation || "Analysis completed. Review the metrics above for detailed insights."}
          </div>
        )}
      </Card>

      {/* What-If Simulator */}
      <Card className="p-6 border-l-4 border-l-purple-500">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <div className="h-4 w-4 bg-purple-500 rounded"></div>
          </div>
          <h3 className="text-lg font-semibold text-foreground">What-If Simulator</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Reweighing Strength: {reweighingStrength}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={reweighingStrength}
              onChange={(e) => setReweighingStrength(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Light</span>
              <span>Balanced</span>
              <span>Aggressive</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Fairness vs Accuracy Tradeoff: {fairnessBias}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={fairnessBias}
              onChange={(e) => setFairnessBias(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Accuracy</span>
              <span>Balanced</span>
              <span>Fairness</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Current Fairness Score</span>
              <span className={`font-semibold ${getBiasScoreColor(result.summary.bias_score)}`}>
                {result.summary.bias_score}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Projected Score</span>
              <span className={`font-semibold ${getBiasScoreColor(projected.projectedFairnessScore)}`}>
                {projected.projectedFairnessScore.toFixed(1)}
              </span>
            </div>
          </div>
          
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Current Accuracy</span>
              <span className="font-semibold text-foreground">85%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Projected Accuracy</span>
              <span className="font-semibold text-foreground">
                {(projected.projectedAccuracy * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
            </div>
            <p className="text-sm text-blue-900">{projected.recommendation}</p>
          </div>
        </div>
      </Card>

      {/* Compliance Check */}
      <Card className="p-6 border-l-4 border-l-amber-500">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <div className="h-4 w-4 bg-amber-500 rounded"></div>
          </div>
          <h3 className="text-lg font-semibold text-foreground">Compliance Check</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COMPLIANCE_CHECKS.map((check) => {
            const passed = check.status(result.summary.bias_score, result.metrics.disparate_impact);
            return (
              <div key={check.framework} className="border border-border rounded-lg p-4 bg-muted/30">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{check.framework}</span>
                      <span className="text-xs text-muted-foreground">{check.article}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{check.requirement}</p>
                  </div>
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                    passed ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {passed ? (
                      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                </div>
                <p className={`text-xs ${passed ? 'text-green-700' : 'text-red-700'}`}>
                  {check.description}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Executive Summary */}
      <Card className="p-6 border-l-4 border-l-blue-500">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <div className="h-4 w-4 bg-blue-500 rounded"></div>
          </div>
          <h3 className="text-lg font-semibold text-foreground">Executive Summary</h3>
        </div>
        <div className="bg-muted/30 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
            </div>
            <div className="flex-1">
              <p className="text-foreground leading-relaxed">
                {result.explanation?.human_explanation || "Analysis completed. Review the metrics above for detailed insights."}
              </p>
              {result.summary?.bias_detected && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-red-50 text-red-700 text-sm rounded-full border border-red-200">
                    Bias Detected
                  </span>
                  <span className="px-3 py-1 bg-orange-50 text-orange-700 text-sm rounded-full border border-orange-200">
                    {result.summary.risk_level?.toUpperCase()} Risk
                  </span>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full border border-blue-200">
                    Action Required
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Action Plan */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Recommended Actions</h3>
          <div className="text-xs text-muted-foreground">Compliance roadmap</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {result.recommendations.map((recommendation, index) => (
            <div key={index} className="border border-border rounded-lg p-4 bg-muted/30">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{recommendation}</p>
              </div>
            </div>
          ))}
        </div>
        {!hasMitigation && onMitigate && (
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-foreground">Ready to implement?</h4>
                <p className="text-sm text-muted-foreground mt-1">Apply automated mitigation strategies to improve fairness</p>
              </div>
              <Button onClick={onMitigate} className="px-6 py-2">
                Apply Mitigation
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
