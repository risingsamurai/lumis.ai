import { Card } from "../components/ui/Card";
import { useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

export default function Playground() {
  const [removeZipcode, setRemoveZipcode] = useState(false);
  const [metricWeight, setMetricWeight] = useState(50);

  const simulated = useMemo(
    () => [
      { step: "baseline", score: removeZipcode ? 74 : 63 },
      { step: "metric tuned", score: removeZipcode ? 81 : 69 },
      { step: "post-mitigation", score: removeZipcode ? 88 : 76 + metricWeight / 20 }
    ],
    [metricWeight, removeZipcode]
  );

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-xl font-bold">Fairness Playground</h2>
        <p className="mt-2 text-white/70">What-if simulator: remove proxy features and tune fairness constraints.</p>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={removeZipcode} onChange={(e) => setRemoveZipcode(e.target.checked)} />
          Remove "zipcode" feature
        </label>
        <label className="mt-2 block text-sm">
          Metric sensitivity ({metricWeight}%)
          <input
            className="mt-2 w-full"
            type="range"
            min={10}
            max={100}
            value={metricWeight}
            onChange={(e) => setMetricWeight(Number(e.target.value))}
          />
        </label>
      </Card>
      <Card className="h-80">
        <div className="h-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={simulated}>
              <XAxis dataKey="step" stroke="#ddd" />
              <YAxis stroke="#ddd" />
              <Tooltip />
              <Line dataKey="score" stroke="#00C2A8" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
