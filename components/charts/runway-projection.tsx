"use client";

import { useEffect, useRef, useState } from "react";
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
  /** Pre-computed month labels indexed by month number. Server-rendered. */
  monthLabels: string[];
  /** Status color used for the line stroke. Defaults to brand. */
  lineColor?: string;
}

export function RunwayProjection({
  projection,
  monthLabels,
  lineColor = "var(--color-brand)",
}: RunwayProjectionProps) {
  // Manual width measurement instead of ResponsiveContainer, which keeps
  // hitting -1 width during SSR and first paint. Measure the parent ourselves
  // with ResizeObserver and pass an exact pixel width to recharts.
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const update = () => {
      if (ref.current) setWidth(ref.current.clientWidth);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full" style={{ height: CHART_HEIGHT }}>
      {width > 0 && (
        <LineChart
          width={width}
          height={CHART_HEIGHT}
          data={projection.points}
          margin={{ top: 16, right: 24, bottom: 8, left: 8 }}
        >
          <XAxis
            dataKey="month"
            tickFormatter={(m: number) => monthLabels[m] ?? ""}
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
      )}
    </div>
  );
}
