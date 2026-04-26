import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../components/ui/Card";
import { SeverityBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { useAuditStore } from "../store/auditStore";
import { Skeleton } from "../components/ui/Skeleton";

export default function Dashboard() {
  const { latestAnalysis, loading, error } = useAuditStore();
  const score = latestAnalysis?.fairnessScore ?? 0;
  const severity = score > 85 ? "fair" : score > 70 ? "minor" : score > 55 ? "moderate" : "high";

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (!latestAnalysis) {
    return (
      <Card>
        <h2 className="text-xl font-bold">No audits yet</h2>
        <p className="mt-2 text-white/70">Run Demo Mode or upload a dataset to generate your first fairness report.</p>
        <Link className="mt-4 inline-block" to="/audit/new">
          <Button>Start New Audit</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Bias Score", latestAnalysis.fairnessScore.toFixed(1)],
          ["Risk Level", latestAnalysis.biasLevel.toUpperCase()],
          ["Rows", latestAnalysis.numRows.toString()],
          ["Bias Detected", latestAnalysis.biasDetected ? "YES" : "NO"]
        ].map(([k, v]) => (
          <motion.div key={k} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
            <p className="text-sm text-white/60">{k}</p>
            <p className="mt-1 text-2xl font-bold">{v}</p>
            </Card>
          </motion.div>
        ))}
      </div>
      {error ? <p className="text-sm text-brand-danger">{error}</p> : null}
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Recent Audits</h2>
          <Link to="/audit/new">
            <Button>Start New Audit</Button>
          </Link>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-white/5 p-3">
          <div>
            <p className="font-semibold">Latest Analysis</p>
            <p className="text-sm text-white/60">Fairness score: {latestAnalysis.fairnessScore.toFixed(1)}</p>
          </div>
          <SeverityBadge severity={severity} />
        </div>
      </Card>
      <Card className="h-72">
        <h2 className="text-xl font-bold">Fairness Score Trend (30 Days)</h2>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={[
                { day: "D-30", score: 57 },
                { day: "D-24", score: 61 },
                { day: "D-18", score: 66 },
                { day: "D-12", score: 70 },
                { day: "D-6", score: 73 },
                { day: "Today", score }
              ]}
            >
              <XAxis dataKey="day" stroke="#ddd" />
              <YAxis stroke="#ddd" />
              <Tooltip />
              <Line dataKey="score" stroke="#6C47FF" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
