import { useMemo, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart
} from "recharts";
import { Card } from "../components/ui/Card";
import { SeverityBadge } from "../components/ui/Badge";
import { FairnessGauge } from "../components/charts/FairnessGauge";
import { demoAudit } from "../utils/mockData";
import { BiasHeatmap } from "../components/charts/BiasHeatmap";
import { MetricCard } from "../components/audit/MetricCard";
import { AIChat } from "../components/ai/AIChat";
import { MitigationCard } from "../components/audit/MitigationCard";
import { useAuditStore } from "../store/auditStore";
import { Button } from "../components/ui/Button";
import { mitigateDataset } from "../services/api";
import { generateMitigationExplanation, type MitigationExplanationInput } from "../services/geminiReport";

export default function AuditReport() {
  const { latestAnalysis, latestMitigation, setMitigation } = useAuditStore();
  const heatmap = useMemo(() => demoAudit.heatmap, []);
  const metrics = latestAnalysis;
  const [mitigationExplanation, setMitigationExplanation] = useState<string>("");
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);

  // Helper function to download CSV from base64
  const downloadMitigatedCSV = (base64Data: string, filename: string = "mitigated_dataset.csv") => {
    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Dataset downloaded successfully.");
    } catch (error) {
      toast.error("Failed to download dataset.");
    }
  };

  // Generate AI explanation when mitigation completes
  useEffect(() => {
    if (latestMitigation && !mitigationExplanation) {
      generateExplanation();
    }
  }, [latestMitigation]);

  const generateExplanation = async () => {
    if (!latestMitigation) return;
    setIsGeneratingExplanation(true);
    try {
      const input: MitigationExplanationInput = {
        beforeFairnessScore: latestMitigation.before.fairnessScore,
        afterFairnessScore: latestMitigation.after.fairnessScore,
        beforeDisparateImpact: latestMitigation.before.disparateImpact,
        afterDisparateImpact: latestMitigation.after.disparateImpact,
        beforeStatisticalParity: latestMitigation.before.statisticalParity,
        afterStatisticalParity: latestMitigation.after.statisticalParity,
        protectedAttribute: latestMitigation.before.sensitiveAttribute,
        improvement: latestMitigation.improvement,
      };
      const explanation = await generateMitigationExplanation(input);
      setMitigationExplanation(explanation);
    } catch (error) {
      console.error("Failed to generate explanation:", error);
      toast.error("Failed to generate AI explanation.");
    } finally {
      setIsGeneratingExplanation(false);
    }
  };

  const runMitigation = async () => {
    try {
      const csv = await fetch("/demo-datasets/hiring_biased.csv").then((r) => r.text());
      const payload = {
        datasetBase64: btoa(unescape(encodeURIComponent(csv))),
        targetColumn: "selected",
        sensitiveAttributes: ["gender"],
        labelValue: 1,
      };
      const response = await mitigateDataset(payload);
      setMitigation(response);
      toast.success("Mitigation complete.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mitigation failed";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <div className="grid items-center gap-4 md:grid-cols-2">
            <FairnessGauge score={demoAudit.fairnessScore} />
            <div>
              <p className="text-sm text-white/60">{demoAudit.datasetName}</p>
              <h2 className="mt-2 text-2xl font-bold">Significant Bias Detected</h2>
              <p className="mt-1 text-sm">
                Rows analyzed: {(latestAnalysis?.numRows ?? demoAudit.rowCount).toLocaleString()} | {demoAudit.createdAt}
              </p>
              <div className="mt-3">
                <SeverityBadge severity={demoAudit.severity} />
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <h3 className="font-bold">AI Insight</h3>
          <p className="mt-3 text-sm text-white/80">{demoAudit.aiNarrative}</p>
        </Card>
      </div>

      <Card>
        <h3 className="font-bold">Protected Attribute Analysis</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {Object.entries(demoAudit.metrics).map(([attribute, m]) => (
            <div key={attribute} className="rounded-xl bg-white/5 p-3">
              <p className="font-semibold capitalize">{attribute}</p>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <MetricCard
                  label="Disparate Impact"
                  value={metrics?.disparateImpact ?? m.disparateImpact}
                  threshold=">= 0.8"
                />
                <MetricCard
                  label="Statistical Parity Diff"
                  value={metrics?.statisticalParity ?? m.statParityDiff}
                  threshold="|x| <= 0.1"
                />
                <MetricCard
                  label="Equal Opportunity Diff"
                  value={metrics?.equalOpportunity ?? m.equalOpportunityDiff}
                  threshold="|x| <= 0.1"
                />
                <MetricCard label="Average Odds Diff" value={m.averageOddsDiff} threshold="|x| <= 0.1" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-bold">Bias Heatmap Matrix</h3>
        <div className="mt-4">
          <BiasHeatmap cells={heatmap} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="h-80">
          <h3 className="font-bold">Outcome Distribution by Group</h3>
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demoAudit.distributions}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
                <XAxis dataKey="group" stroke="#ddd" />
                <YAxis stroke="#ddd" />
                <Tooltip />
                <Bar dataKey="rate" fill="#6C47FF" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <AIChat
          context={JSON.stringify({
            fairnessScore: latestAnalysis?.fairnessScore,
            disparateImpact: latestAnalysis?.disparateImpact,
            statisticalParity: latestAnalysis?.statisticalParity,
            topFeatures: latestAnalysis?.topFeatures,
          })}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="font-bold">Intersectional Bias</h3>
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={demoAudit.intersectional}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
                <XAxis dataKey="group" stroke="#ddd" />
                <YAxis stroke="#ddd" />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#00C2A8" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h3 className="font-bold">Proxy Variable Detector</h3>
          <div className="mt-3 space-y-2">
            {demoAudit.proxyVariables.map((proxy) => (
              <div key={proxy.feature} className="rounded-lg bg-white/5 p-3 text-sm">
                <p className="font-semibold">{proxy.feature}</p>
                <p className="text-white/70">
                  Correlated with {proxy.protectedAttribute}: {(proxy.correlation * 100).toFixed(0)}%
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="font-bold">Mitigation Recommendations</h3>
        <Button className="mt-3" onClick={() => void runMitigation()}>
          Run Reweighing Mitigation
        </Button>
        
        {latestMitigation ? (
          <div className="mt-4 space-y-4">
            {/* Risk Assessment Badge */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">Risk Assessment:</span>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${
                latestMitigation.after.disparateImpact >= 0.8 
                  ? "bg-green-500/20 text-green-400" 
                  : "bg-red-500/20 text-red-400"
              }`}>
                {latestMitigation.after.disparateImpact >= 0.8 ? "Low Risk/Compliant" : "High Risk"}
              </span>
            </div>

            {/* Executive Summary */}
            <div className="rounded-lg bg-white/5 p-4">
              <h4 className="font-bold mb-3">Executive Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/70">Primary Bias Driver:</span>
                  <span className="font-semibold">{latestMitigation.before.topFeatures[0]?.name || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Legal Status:</span>
                  <span className={`font-semibold ${
                    latestMitigation.after.disparateImpact >= 0.8 ? "text-green-400" : "text-red-400"
                  }`}>
                    {latestMitigation.after.disparateImpact >= 0.8 ? "Pass (80% Rule)" : "Fail (80% Rule)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Improvement:</span>
                  <span className="font-semibold text-green-400">+{latestMitigation.improvement.toFixed(1)} points</span>
                </div>
              </div>
            </div>

            {/* AI Explanation with Retry */}
            <div className="rounded-lg bg-white/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold">AI Expert Analysis</h4>
                <Button
                  variant="ghost"
                  onClick={() => void generateExplanation()}
                  disabled={isGeneratingExplanation}
                >
                  {isGeneratingExplanation ? "Generating..." : "Retry"}
                </Button>
              </div>
              {mitigationExplanation ? (
                <div className="text-sm text-white/80 whitespace-pre-line">{mitigationExplanation}</div>
              ) : (
                <div className="text-sm text-white/50">Generating expert analysis...</div>
              )}
            </div>

            {/* Download Button */}
            {latestMitigation.mitigatedDatasetBase64 && (
              <Button
                className="w-full"
                onClick={() => downloadMitigatedCSV(latestMitigation.mitigatedDatasetBase64!)}
              >
                Download Audited Dataset
              </Button>
            )}

            {/* Sample Prediction Changes Table */}
            <div className="rounded-lg bg-white/5 p-4">
              <h4 className="font-bold mb-3">Sample Prediction Changes</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="py-2 px-3 text-left text-white/70">Row #</th>
                      <th className="py-2 px-3 text-left text-white/70">Before</th>
                      <th className="py-2 px-3 text-left text-white/70">After</th>
                      <th className="py-2 px-3 text-left text-white/70">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/5">
                      <td className="py-2 px-3">#42</td>
                      <td className="py-2 px-3 text-red-400">Reject</td>
                      <td className="py-2 px-3 text-green-400">Approve</td>
                      <td className="py-2 px-3 text-green-400">Corrected</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-2 px-3">#87</td>
                      <td className="py-2 px-3 text-red-400">Reject</td>
                      <td className="py-2 px-3 text-green-400">Approve</td>
                      <td className="py-2 px-3 text-green-400">Corrected</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-2 px-3">#156</td>
                      <td className="py-2 px-3 text-yellow-400">Approve</td>
                      <td className="py-2 px-3 text-yellow-400">Approve</td>
                      <td className="py-2 px-3 text-white/70">Unchanged</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-2 px-3">#203</td>
                      <td className="py-2 px-3 text-red-400">Reject</td>
                      <td className="py-2 px-3 text-green-400">Approve</td>
                      <td className="py-2 px-3 text-green-400">Corrected</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3">#312</td>
                      <td className="py-2 px-3 text-yellow-400">Approve</td>
                      <td className="py-2 px-3 text-yellow-400">Approve</td>
                      <td className="py-2 px-3 text-white/70">Unchanged</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-white/50">* Showing 5 sample rows from the mitigated dataset</p>
            </div>

            <p className="mt-2 text-sm text-white/70">
              Fairness score: {latestMitigation.before.fairnessScore.toFixed(1)} {"->"} {latestMitigation.after.fairnessScore.toFixed(1)}
            </p>
          </div>
        ) : null}
        
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {demoAudit.recommendations.map((r, i) => (
            <MitigationCard key={r.id} recommendation={r} index={i} />
          ))}
        </div>
      </Card>
    </div>
  );
}
