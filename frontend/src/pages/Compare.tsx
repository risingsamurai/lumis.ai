import { Card } from "../components/ui/Card";
import { demoAudit } from "../utils/mockData";
import { SeverityBadge } from "../components/ui/Badge";

export default function Compare() {
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-xl font-bold">Compare Audits</h2>
        <p className="mt-2 text-white/70">Side-by-side fairness diff for audit trend analysis.</p>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="text-sm text-white/60">Audit A</p>
          <p className="font-semibold">{demoAudit.datasetName}</p>
          <p className="mt-1">Score: {demoAudit.fairnessScore}</p>
          <SeverityBadge severity={demoAudit.severity} />
        </Card>
        <Card>
          <p className="text-sm text-white/60">Audit B (After Fixes)</p>
          <p className="font-semibold">{demoAudit.datasetName} v2</p>
          <p className="mt-1">Score: 84</p>
          <SeverityBadge severity="minor" />
        </Card>
      </div>
      <Card>
        <p className="font-semibold">Diff View</p>
        <div className="mt-2 space-y-2 text-sm">
          <p>Disparate Impact (gender): 0.64 {"->"} 0.82</p>
          <p>Statistical Parity Difference (race): -0.14 {"->"} -0.07</p>
          <p>Overall fairness score: 68 {"->"} 84</p>
        </div>
      </Card>
    </div>
  );
}
