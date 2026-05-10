"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import type { SavingsProjection } from "@/lib/utils/projection";
import { formatCurrencyCompact } from "@/lib/utils/format";

const CHART_HEIGHT = 240;

interface RunwayProjectionProps {
  projection: SavingsProjection;
  /** Status color used for the line stroke. Defaults to brand. */
  lineColor?: string;
}

export function RunwayProjection({
  projection,
  lineColor = "var(--color-brand)",
}: RunwayProjectionProps) {
  // Recharts SSR measure issue: use a width that we know fits the dashboard.
  // Outer wrapper is overflow-x auto so on narrow screens the user can scroll.
  const CHART_WIDTH = 720;

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <LineChart
        width={CHART_WIDTH}
        height={CHART_HEIGHT}
        data={projection.points}
        margin={{ top: 20, right: 24, bottom: 8, left: 8 }}
      >
        <XAxis
          dataKey="month"
          tickFormatter={(m) => (m === 0 ? "Now" : `${m}mo`)}
          stroke="var(--color-foreground-subtle)"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "var(--color-border)" }}
        />
        <YAxis
          tickFormatter={(v) => formatCurrencyCompact(v)}
          stroke="var(--color-foreground-subtle)"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        {/* Zero baseline for context */}
        <ReferenceLine
          y={0}
          stroke="var(--color-border-strong)"
          strokeDasharray="2 4"
        />
        {/* Depletion marker — only when we hit zero in the window */}
        {projection.depletionMonth !== null && (
          <ReferenceDot
            x={projection.depletionMonth}
            y={0}
            r={5}
            fill="var(--color-status-red)"
            stroke="var(--color-surface-raised)"
            strokeWidth={2}
          />
        )}
        <Line
          type="monotone"
          dataKey="balance"
          stroke={lineColor}
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={false}
          activeDot={{ r: 4, fill: lineColor }}
          isAnimationActive={false}
        />
      </LineChart>
    </div>
  );
}
