import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

export function FairnessGauge({ score }: { score: number }) {
  const bounded = Math.max(0, Math.min(100, score));
  const data = [
    { name: "score", value: bounded },
    { name: "rest", value: 100 - bounded }
  ];

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            startAngle={225}
            endAngle={-45}
            innerRadius={70}
            outerRadius={90}
            dataKey="value"
            stroke="none"
          >
            <Cell fill={bounded > 90 ? "#22C55E" : bounded > 75 ? "#FFB740" : "#FF4D6D"} />
            <Cell fill="rgba(255,255,255,0.12)" />
          </Pie>
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#fff"
            fontSize={36}
            fontWeight={700}
          >
            {bounded}
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
