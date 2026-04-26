import type { HeatmapCell } from "../../types/audit";

function colorFor(value: number) {
  if (value <= -0.1) {
    return "#FF4D6D";
  }
  if (value <= 0.05) {
    return "#FFB740";
  }
  return "#22C55E";
}

export function BiasHeatmap({ cells }: { cells: HeatmapCell[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {cells.map((cell) => (
        <div
          key={`${cell.attribute}-${cell.metric}`}
          className="rounded-lg p-2 text-xs"
          style={{ backgroundColor: colorFor(cell.value) }}
        >
          <p className="font-semibold capitalize text-black">{cell.attribute}</p>
          <p className="text-black/80">{cell.metric}</p>
          <p className="font-bold text-black">{cell.value.toFixed(2)}</p>
        </div>
      ))}
    </div>
  );
}
