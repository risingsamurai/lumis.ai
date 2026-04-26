import type { Recommendation } from "../../types/audit";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

export function MitigationCard({
  recommendation,
  index
}: {
  recommendation: Recommendation;
  index: number;
}) {
  return (
    <Card className="p-3">
      <p className="font-semibold">
        {index + 1}. {recommendation.title}
      </p>
      <p className="mt-1 text-sm text-white/70">{recommendation.description}</p>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="rounded-full bg-white/10 px-2 py-1">Effort: {recommendation.effort}</span>
        <span>
          {recommendation.beforeScore} {"->"} {recommendation.afterScore}
        </span>
      </div>
      <Button className="mt-3 w-full">Apply Fix</Button>
    </Card>
  );
}
