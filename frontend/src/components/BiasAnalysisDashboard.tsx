import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Download, Target, ShieldCheck } from "lucide-react";
import { useAnalysis } from "../hooks/useAnalysis";
import { AnalysisResult, MitigationResult } from "../services/api";
import { generateMitigationExplanation, cleanFeatureName } from "../services/geminiReport";

export function BiasAnalysisDashboard() {
  const { state, loadFile, setConfig, runAnalysis, runMitigation, reset, loadDemoDataset, setEnableSampling } = useAnalysis();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSettings, setShowSettings] = useState(false);

  // ── Step 1: Idle / Upload ──────────────────────────────────────────────────
  if (state.step === "idle") {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-16">
          <p className="text-sm uppercase tracking-[0.22em] text-white/30">
            Upload Custom Dataset
          </p>

          <h2 className="mt-6 text-4xl md:text-6xl font-light tracking-tight text-white">
            Detect Bias in Any AI Dataset
          </h2>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/50">
            Run fairness diagnostics across hiring, lending, healthcare, and
            justice systems with production-grade explainability.
          </p>
        </div>

        {/* Demo Dataset Cards */}
        <div className="grid gap-6 md:grid-cols-12 mb-10">
          {[
            {
              id: "hiring",
              index: "/01",
              title: "Hiring Bias Audit",
              desc: "Detect gender disparities in employment decisions.",
            },
            {
              id: "lending",
              index: "/02",
              title: "Lending Risk Audit",
              desc: "Audit credit approval fairness across demographics.",
            },
            {
              id: "healthcare",
              index: "/03",
              title: "Healthcare Equity",
              desc: "Measure fairness in patient readmission models.",
            },
            {
              id: "criminal",
              index: "/04",
              title: "Justice Risk Audit",
              desc: "Evaluate fairness in criminal risk scoring systems.",
            },
          ].map((d, i) => (
            <motion.button
              key={d.id}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => loadDemoDataset(d.id)}
              className={`border border-white/10 p-8 text-left transition-all duration-300 hover:border-white/30 hover:bg-white/[0.02] ${i === 0 ? "md:col-span-6" : "md:col-span-3"
                } col-span-12`}
            >
              <p className="text-sm text-white/30">{d.index}</p>

              <h3 className="mt-4 text-2xl font-medium tracking-tight text-white">
                {d.title}
              </h3>

              <p className="mt-4 text-sm leading-relaxed text-white/40">
                {d.desc}
              </p>
            </motion.button>
          ))}
        </div>

        {/* Upload Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file && file.name.endsWith(".csv")) {
              loadFile(file);
            } else {
              toast.error("Please upload a CSV file");
            }
          }}
          className="border border-dashed border-white/20 p-20 text-center cursor-pointer transition-all duration-300 hover:border-white/40"
        >
          <div className="flex flex-col items-center justify-center">
            <div className="mb-8 text-6xl font-light text-white/20">⊕</div>

            <h3 className="text-3xl font-light tracking-tight text-white">
              Upload Dataset
            </h3>

            <p className="mt-4 max-w-lg text-base leading-relaxed text-white/40">
              Drop CSV files to run production-grade fairness audits powered by
              LUMIS.
            </p>

            <div className="mt-8 flex gap-6 text-xs uppercase tracking-[0.18em] text-white/20">
              <span>CSV</span>
              <span>Fairness</span>
              <span>Explainability</span>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) loadFile(file);
            }}
          />
        </div>
      </div>
    );
  }

  // ── Step 2: Analyzing (loading) ────────────────────────────────────────────
  if (state.step === "analyzing") {
    return (
      <div className="fixed inset-0 bg-gray-950/95 backdrop-blur-sm z-50 
                      flex flex-col items-center justify-center gap-6">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-emerald-500 
                          rounded-full animate-spin" />
        </div>

        <div className="text-center">
          <p className="text-white text-xl font-semibold mb-1">Analyzing your dataset...</p>
          <p className="text-gray-400 text-sm">Running AIF360 fairness metrics + SHAP explanations</p>
        </div>

        {/* Progress bar */}
        <div className="w-72 bg-gray-800 rounded-full h-1.5">
          <motion.div
            className="bg-emerald-500 h-1.5 rounded-full"
            animate={{ width: `${state.progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <div className="flex gap-6 text-xs text-gray-600">
          {["Loading data", "Computing metrics", "Running SHAP", "Generating report"].map((s, i) => (
            <span key={s} className={state.progress > i * 25 ? "text-emerald-500" : ""}>{s}</span>
          ))}
        </div>

        <p className="text-gray-700 text-xs">First run may take 30–60s while server warms up</p>
      </div>
    );
  }

  // ── Step 2.5: Fallback Configuration (only when auto-detection fails) ──────────
  if (state.step === "configuring") {
    const { csvColumns, request, rowCount } = state;

    return (
      <div className="fixed inset-0 bg-gray-950/95 backdrop-blur-sm z-50 
                      flex flex-col items-center justify-center">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🤔</div>
            <h2 className="text-xl font-bold text-white mb-2">Couldn't auto-detect schema</h2>
            <p className="text-gray-400 text-sm">
              We need your help to identify the target column and protected attribute.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-gray-300 text-sm font-medium block mb-1.5">
                Target column (what's being predicted)
              </label>
              <select
                value={request.targetColumn || ""}
                onChange={e => setConfig("targetColumn", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                           text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select column...</option>
                {csvColumns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-gray-300 text-sm font-medium block mb-1.5">
                Protected attribute (sex, race, age, etc.)
              </label>
              <select
                value={request.sensitiveAttributes?.[0] || ""}
                onChange={e => setConfig("sensitiveAttributes", [e.target.value])}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                           text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select attribute...</option>
                {csvColumns
                  .filter(c => c !== request.targetColumn)
                  .map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {rowCount > 30000 && (
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-blue-300 text-sm font-medium">
                    Sample 10k rows for faster analysis
                  </label>
                  <button
                    onClick={() => setEnableSampling(!state.enableSampling)}
                    className={`w-12 h-6 rounded-full transition-colors ${state.enableSampling ? 'bg-emerald-500' : 'bg-gray-600'
                      }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${state.enableSampling ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                  </button>
                </div>
                <p className="text-gray-400 text-xs">
                  Dataset has {rowCount.toLocaleString()} rows. Sampling maintains statistical significance while reducing analysis time.
                </p>
              </div>
            )}

            <button
              onClick={runAnalysis}
              disabled={!request.targetColumn || !request.sensitiveAttributes?.[0]}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 
                         disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm"
            >
              Analyze Dataset
            </button>

            <button
              onClick={reset}
              className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 4: Error ──────────────────────────────────────────────────────────
  if (state.step === "error") {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-12 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-white text-xl font-bold mb-2">Analysis Failed</h2>
        <p className="text-gray-400 text-sm mb-2">{state.error}</p>
        <p className="text-gray-600 text-xs mb-6">
          Common causes: CSV doesn't have the selected columns, or the backend is cold-starting (wait 30s and retry)
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={runAnalysis}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white 
                       rounded-lg text-sm font-medium transition-colors"
          >
            Retry Analysis
          </button>
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 
                       rounded-lg text-sm font-medium transition-colors"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  // ── Step 5: Results ────────────────────────────────────────────────────────
  if (state.step === "done" && state.result) {
    return (
      <BiasReport
        result={state.result}
        mitigation={state.mitigation}
        onMitigate={runMitigation}
        onReset={reset}
        isAnalyzing={false}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
      />
    );
  }

  return null;
}

// ─── Bias Report Component ────────────────────────────────────────────────────

function BiasReport({
  result, mitigation, onMitigate, onReset, isAnalyzing, showSettings, setShowSettings
}: {
  result: AnalysisResult;
  mitigation: MitigationResult | null;
  onMitigate: () => void;
  onReset: () => void;
  isAnalyzing: boolean;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
}) {
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  const handleDownloadDataset = () => {
    console.log("Downloading data:", mitigation);
    const csvData = mitigation?.mitigated_dataset_csv ||
      (mitigation?.mitigated_dataset_base64 ? atob(mitigation.mitigated_dataset_base64) : null);

    if (!csvData) {
      console.error("❌ Still no data! Payload received:", mitigation);
      alert("Data sync error: The backend is not sending the CSV string.");
      return;
    }

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Lumis_Audited_Data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const regenerateExplanation = () => {
    if (!mitigation) return;
    setLoadingExplanation(true);
    generateMitigationExplanation({
      beforeFairnessScore: mitigation.before.fairnessScore,
      afterFairnessScore: mitigation.after.fairnessScore,
      beforeDisparateImpact: mitigation.before.disparateImpact,
      afterDisparateImpact: mitigation.after.disparateImpact,
      beforeStatisticalParity: mitigation.before.statisticalParity,
      afterStatisticalParity: mitigation.after.statisticalParity,
      protectedAttribute: result.sensitiveAttribute,
      improvement: mitigation.improvement,
    })
      .then(setAiExplanation)
      .catch(() => setAiExplanation("Unable to generate AI explanation."))
      .finally(() => setLoadingExplanation(false));
  };

  // Generate AI explanation after mitigation is done
  if (mitigation && !aiExplanation && !loadingExplanation) {
    regenerateExplanation();
  }
  const LEVEL_CONFIG = {
    none: { color: "emerald", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", label: "No Bias Detected", emoji: "✅" },
    low: { color: "blue", bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", label: "Low Bias", emoji: "🟡" },
    moderate: { color: "amber", bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", label: "Moderate Bias", emoji: "⚠️" },
    high: { color: "orange", bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", label: "High Bias Detected", emoji: "🔴" },
    critical: { color: "red", bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", label: "Critical Bias", emoji: "🚨" },
  };

  const cfg = LEVEL_CONFIG[result.biasLevel];

  const metrics = [
    {
      label: "Disparate Impact",
      value: result.disparateImpact.toFixed(3),
      pass: result.disparateImpact >= 0.8,
      threshold: "≥ 0.80 (EEOC 4/5ths rule)",
      tooltip: "Ratio of favorable outcomes between groups. Below 0.8 = legal risk.",
    },
    {
      label: "Statistical Parity",
      value: result.statisticalParity.toFixed(3),
      pass: Math.abs(result.statisticalParity) <= 0.1,
      threshold: "≤ ±0.10",
      tooltip: "Difference in positive outcome rates. Closer to 0 = more fair.",
    },
    {
      label: "Equal Opportunity",
      value: result.equalOpportunity.toFixed(3),
      pass: Math.abs(result.equalOpportunity) <= 0.1,
      threshold: "≤ ±0.10",
      tooltip: "Difference in true positive rates between groups.",
    },
    {
      label: "Average Odds",
      value: result.averageOdds.toFixed(3),
      pass: Math.abs(result.averageOdds) <= 0.1,
      threshold: "≤ ±0.10",
      tooltip: "Combined measure of TPR and FPR differences.",
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button onClick={onReset} className="text-gray-500 hover:text-gray-300 text-sm flex items-center gap-1">
          ← New Analysis
        </button>
        <div className="flex items-center gap-2">
          {/* Live Audit Badge */}
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-emerald-400 tracking-wide">Live Audit Active</span>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            title="Change analysis settings"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Audit Identity Strip — HUD style */}
      <div className="grid grid-cols-2 gap-4">
        {/* Predicting Card — blue accent */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-800 border-l-4 border-l-blue-500 bg-slate-900/50 px-5 py-4 backdrop-blur-sm min-h-[88px]">
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="w-3 h-3 text-blue-400 shrink-0" />
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
              Predicting
            </span>
          </div>
          <p className="text-lg font-bold text-white truncate leading-tight">
            {result.targetColumn}
          </p>
        </div>

        {/* Protected Attribute Card — purple accent */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-800 border-l-4 border-l-purple-500 bg-slate-900/50 px-5 py-4 backdrop-blur-sm min-h-[88px]">
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldCheck className="w-3 h-3 text-purple-400 shrink-0" />
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
              Protected Attribute
            </span>
          </div>
          <p className="text-lg font-bold text-white truncate leading-tight">
            {result.sensitiveAttribute}
          </p>
        </div>
      </div>

      {/* Bias Level Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border ${cfg.bg} ${cfg.border} p-6`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{cfg.emoji}</span>
              <h2 className={`text-xl font-bold ${cfg.text}`}>{cfg.label}</h2>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed max-w-2xl">
              {result.biasExplanation}
            </p>
          </div>
          <div className="text-right ml-6">
            <div className={`text-5xl font-bold ${cfg.text}`}>{result.fairnessScore}</div>
            <div className="text-gray-600 text-xs">/ 100 fairness score</div>
          </div>
        </div>
      </motion.div>

      {/* Metrics Grid — core legal metrics only (Equal Opportunity & Average Odds kept in state) */}
      <div className="grid grid-cols-2 gap-4">
        {metrics.slice(0, 2).map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`rounded-2xl border p-6 ${
              m.pass
                ? "bg-emerald-950/30 border-emerald-800/30"
                : "bg-red-950/30 border-red-800/30"
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <span className="text-gray-400 text-xs uppercase tracking-widest leading-tight">
                {m.label}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold tracking-wide ${
                  m.pass
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-red-500/20 text-red-300 border border-red-500/40"
                }`}
              >
                {m.pass ? "✓ PASS" : "✗ FAIL"}
              </span>
            </div>
            <div className={`text-5xl font-bold tracking-tight ${m.pass ? "text-emerald-300" : "text-red-300"}`}>
              {m.value}
            </div>
            <div className="text-gray-600 text-xs mt-3">Threshold: {m.threshold}</div>
          </motion.div>
        ))}
      </div>

      {/* Compliance Check */}
      <div className="bg-gray-800/40 rounded-2xl border border-gray-700/50 p-5">
        <h3 className="text-white font-semibold text-sm mb-4">Compliance Check</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { name: "EU AI Act", sub: "Article 10 — bias audit", pass: result.compliance.euAiAct },
            { name: "US EEOC", sub: "4/5ths disparate impact rule", pass: result.compliance.eeoc },
            { name: "GDPR", sub: "Article 22 — explainability", pass: result.compliance.gdpr },
          ].map(c => (
            <div key={c.name} className={`rounded-xl p-3 border ${c.pass
                ? "bg-emerald-950/30 border-emerald-800/30"
                : "bg-red-950/30 border-red-800/30"
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <span>{c.pass ? "✅" : "❌"}</span>
                <span className="text-white text-sm font-medium">{c.name}</span>
              </div>
              <p className="text-gray-500 text-xs">{c.sub}</p>
              <p className={`text-xs font-semibold mt-1 ${c.pass ? "text-emerald-500" : "text-red-500"}`}>
                {c.pass ? "Compliant" : "Non-Compliant"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Top Bias Features */}
      {result.topFeatures.length > 0 && (
        <div className="bg-gray-800/40 rounded-2xl border border-gray-700/50 p-5">
          <h3 className="text-white font-semibold text-sm mb-4">
            Top Bias-Contributing Features
          </h3>
          <div className="space-y-3">
            {result.topFeatures.slice(0, 5).map((f, i) => (
              <div key={i}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300 text-sm font-medium">
                      {cleanFeatureName(f.name)}
                    </span>
                    {f.isProxy && (
                      <span className="text-xs bg-amber-500/20 text-amber-400 
                                       border border-amber-500/30 rounded-full px-2 py-0.5">
                        proxy
                      </span>
                    )}
                  </div>
                  <span className="text-amber-400 text-sm font-semibold">{f.impactPercent}%</span>
                </div>
                <div className="w-full bg-gray-700/50 rounded-full h-1.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, f.impactPercent)}%` }}
                    transition={{ delay: i * 0.1, duration: 0.6 }}
                    className="bg-gradient-to-r from-amber-500 to-red-500 h-1.5 rounded-full"
                  />
                </div>
                {f.explanation && (
                  <p className="text-gray-500 text-xs mt-1 leading-relaxed">{f.explanation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mitigation Section */}
      {!mitigation ? (
        <div className="bg-gray-800/40 rounded-2xl border border-gray-700/50 p-5">
          <h3 className="text-white font-semibold text-sm mb-2">Fix the Bias</h3>
          <p className="text-gray-400 text-xs mb-4">
            Apply the AIF360 Reweighing algorithm to reduce bias while preserving model accuracy.
            Takes 20–40 seconds.
          </p>
          <button
            onClick={onMitigate}
            disabled={isAnalyzing}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50
                       text-white rounded-xl text-sm font-semibold transition-all duration-200
                       hover:shadow-lg hover:shadow-emerald-500/20 flex items-center gap-2"
          >
            ⚡ Apply Bias Mitigation
          </button>
        </div>
      ) : (
        <>
          {/* AI Reasoning Card */}
          {aiExplanation && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-2xl border border-purple-500/30 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🧠</span>
                  <h3 className="text-purple-300 font-semibold text-sm">AI-Powered Explanation</h3>
                </div>
                {aiExplanation === "Unable to generate AI explanation." && (
                  <button
                    onClick={regenerateExplanation}
                    disabled={loadingExplanation}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
                  >
                    {loadingExplanation ? "Retrying..." : "Retry"}
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {aiExplanation.split('\n').map((line, i) => {
                  if (line.trim() === '') return <div key={i} className="h-1" />;
                  // Render lines with inline **bold** support
                  const parts = line.split(/\*\*(.*?)\*\*/g);
                  const isNumbered = /^\d\./.test(line.trim());
                  return (
                    <p key={i} className={`text-sm leading-relaxed ${
                      isNumbered ? 'text-gray-300 pl-3' : 'text-gray-300'
                    }`}>
                      {parts.map((part, j) =>
                        j % 2 === 1
                          ? <strong key={j} className="text-white font-semibold">{part}</strong>
                          : part
                      )}
                    </p>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Algorithm Info Card */}
          <div className="bg-gray-800/40 rounded-2xl border border-gray-700/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">ℹ️</span>
              <h3 className="text-white font-semibold text-sm">How Reweighing Works</h3>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">
              Reweighing assigns higher weights to underrepresented groups who received positive outcomes,
              and lower weights to overrepresented groups. This balances the training data so the model
              learns to make fairer predictions without changing the underlying algorithm. The weights
              are applied during model training, effectively giving more importance to examples that
              would otherwise be overlooked.
            </p>
          </div>

          {/* Metrics Comparison */}
          <div className="bg-gray-800/40 rounded-2xl border border-emerald-700/30 p-5">
            <h3 className="text-emerald-400 font-semibold text-sm mb-4">
              ✅ Mitigation Complete — Reweighing Algorithm Applied
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Fairness Score", before: mitigation.before.fairnessScore, after: mitigation.after.fairnessScore, suffix: "/100", higherBetter: true },
                { label: "Disparate Impact", before: mitigation.before.disparateImpact, after: mitigation.after.disparateImpact, suffix: "", higherBetter: true },
                { label: "Stat. Parity", before: Math.abs(mitigation.before.statisticalParity), after: Math.abs(mitigation.after.statisticalParity), suffix: "", higherBetter: false },
              ].map(m => {
                const improved = m.higherBetter ? m.after > m.before : m.after < m.before;
                return (
                  <div key={m.label} className="text-center">
                    <p className="text-gray-500 text-xs mb-2">{m.label}</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-gray-500 text-lg">{typeof m.before === "number" ? m.before.toFixed(2) : m.before}{m.suffix}</span>
                      <span className="text-gray-600">→</span>
                      <span className={`text-lg font-bold ${improved ? "text-emerald-400" : "text-red-400"}`}>
                        {typeof m.after === "number" ? m.after.toFixed(2) : m.after}{m.suffix}
                      </span>
                    </div>
                    <span className={`text-xs ${improved ? "text-emerald-500" : "text-gray-500"}`}>
                      {improved ? "▲ Improved" : "▼ Unchanged"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 text-center">
              <span className="text-emerald-400 font-semibold text-lg">
                +{mitigation.improvement} point improvement
              </span>
              <span className="text-gray-500 text-xs ml-2">in overall fairness score</span>
            </div>

            <div className="mt-8 flex flex-col items-center gap-4">
              <button
                onClick={handleDownloadDataset}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full transition-all hover:scale-105 shadow-xl"
              >
                <Download className="w-5 h-5" />
                Download Mitigated Dataset (.csv)
              </button>
              <p className="text-xs text-slate-400 italic">This file contains reweighed data for fair model training.</p>
            </div>
          </div>

          {/* Sample Comparison Table */}
          <div className="bg-gray-800/40 rounded-2xl border border-gray-700/50 p-5">
            <h3 className="text-white font-semibold text-sm mb-4">Sample Prediction Changes</h3>
            <p className="text-gray-500 text-xs mb-3">
              The table below shows how predictions changed for 5 sample rows after mitigation.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-700">
                    <th className="text-left py-2 px-2">Row</th>
                    <th className="text-left py-2 px-2">{result.sensitiveAttribute}</th>
                    <th className="text-center py-2 px-2">Before</th>
                    <th className="text-center py-2 px-2">After</th>
                    <th className="text-center py-2 px-2">Change</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  {[
                    { row: 1, attr: "Group A", before: 0, after: 1 },
                    { row: 2, attr: "Group B", before: 1, after: 1 },
                    { row: 3, attr: "Group A", before: 0, after: 0 },
                    { row: 4, attr: "Group B", before: 1, after: 0 },
                    { row: 5, attr: "Group A", before: 0, after: 1 },
                  ].map((row, i) => {
                    const changed = row.before !== row.after;
                    const improved = row.after === 1;
                    return (
                      <tr key={i} className="border-b border-gray-800 last:border-0">
                        <td className="py-2 px-2">{row.row}</td>
                        <td className="py-2 px-2">{row.attr}</td>
                        <td className="text-center py-2 px-2">{row.before}</td>
                        <td className="text-center py-2 px-2">{row.after}</td>
                        <td className="text-center py-2 px-2">
                          {changed ? (
                            <span className={improved ? "text-emerald-400" : "text-amber-400"}>
                              {improved ? "↑" : "↓"}
                            </span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-gray-600 text-xs mt-3 italic">
              * This is a simulated example. Actual row-level changes depend on your dataset.
            </p>
          </div>
        </>
      )}

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold">Analysis Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-500 hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-sm text-gray-400">
                <div className="flex justify-between">
                  <span>Target Column:</span>
                  <span className="text-white">{result.targetColumn}</span>
                </div>
                <div className="flex justify-between">
                  <span>Protected Attribute:</span>
                  <span className="text-white">{result.sensitiveAttribute}</span>
                </div>
                <div className="flex justify-between">
                  <span>Favorable Outcome:</span>
                  <span className="text-white">{result.favorableOutcome}</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-4">
                These columns were auto-detected. To change them, upload a new dataset or use the manual configuration mode.
              </p>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full mt-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
