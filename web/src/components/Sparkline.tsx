"use client";

import { ResponsiveContainer, AreaChart, Area } from "recharts";

interface Props {
  data: number[];
  color?: string;
  className?: string;
  height?: number;
}

export function Sparkline({ data, color = "#9B8AFB", className = "", height = 56 }: Props) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer>
        <AreaChart data={points} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`sp-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.55} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#sp-${color})`}
            isAnimationActive={true}
            animationDuration={1200}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
