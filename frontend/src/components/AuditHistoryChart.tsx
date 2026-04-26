import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card } from "./ui/Card";
import { getAuditHistory, type AuditRecord } from "../services/auditHistory";
import { useAuth } from "../hooks/useAuth";

interface ChartDataPoint {
  date: string;
  fairnessScore: number;
  disparateImpact: number;
}

export default function AuditHistoryChart() {
  const { user } = useAuth();
  const [history, setHistory] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      getAuditHistory(user.uid).then(records => {
        setHistory(records);
        setLoading(false);
      });
    }
  }, [user]);

  const chartData: ChartDataPoint[] = history
    .slice(0, 10)
    .reverse()
    .map(record => ({
      date: new Date(record.createdAt.seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      fairnessScore: record.fairnessScore,
      disparateImpact: record.disparateImpact * 100
    }));

  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="font-bold mb-4">Audit History</h3>
        <div className="h-60 flex items-center justify-center">
          <div className="h-4 w-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="font-bold mb-4">Audit History</h3>
        <div className="h-60 flex flex-col items-center justify-center text-center">
          <p className="text-muted-foreground mb-4">No history yet — run your first analysis</p>
          <div className="text-6xl mb-2">📊</div>
          <p className="text-sm text-muted-foreground">↓ Upload a dataset to get started</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-bold mb-4">Audit History (Last 10 Analyses)</h3>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
            <XAxis dataKey="date" stroke="#ddd" />
            <YAxis domain={[0, 100]} stroke="#ddd" />
            <Tooltip 
              contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)" }}
              labelStyle={{ color: "#fff" }}
            />
            <Line type="monotone" dataKey="fairnessScore" stroke="#10b981" strokeWidth={2} name="Fairness Score" />
            <Line type="monotone" dataKey="disparateImpact" stroke="#f59e0b" strokeWidth={2} name="Disparate Impact × 100" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
