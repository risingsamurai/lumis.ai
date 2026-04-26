import { Card } from "../ui/Card";

interface MetricCardProps {
  label: string;
  value: number;
  threshold: string;
}

export function MetricCard({ label, value, threshold }: MetricCardProps) {
  const danger = Math.abs(value) > 0.1 || (label === "Disparate Impact" && value < 0.8);
  return (
    <Card className="p-3">
      <p className="text-xs text-white/60">{label}</p>
      <p className={`text-xl font-bold ${danger ? "text-brand-danger" : "text-brand-success"}`}>
        {value.toFixed(2)}
      </p>
      <p className="text-xs text-white/50">Threshold: {threshold}</p>
    </Card>
  );
}
