import { clsx } from "clsx";
import type { Severity } from "../../types/audit";

const map: Record<Severity, string> = {
  critical: "bg-brand-danger/20 text-brand-danger",
  high: "bg-orange-500/20 text-orange-300",
  moderate: "bg-brand-warning/20 text-brand-warning",
  minor: "bg-blue-500/20 text-blue-300",
  fair: "bg-brand-success/20 text-brand-success"
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={clsx("rounded-full px-2 py-1 text-xs font-semibold", map[severity])}>
      {severity.toUpperCase()}
    </span>
  );
}
