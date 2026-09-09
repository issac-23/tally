"use client";

import { useEffect, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  ReferenceDot,
  Tooltip,
} from "recharts";
import type { SavingsProjection } from "@/lib/utils/projection";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils/format";

const CHART_HEIGHT = 240;

interface RunwayProjectionProps {
  projection: SavingsProjection;
  /** Pre-computed month labels indexed by month number. Server-rendered. */
  monthLabels: string[];
  /** Status color used for the line stroke. Defaults to brand. */
  lineColor?: string;
  /**
   * The real projection, drawn as a muted ghost behind the main line when the
   * user is exploring a hypothetical. Comparing two lines beats remembering
   * where the old one sat.
   */
  baseline?: SavingsProjection | null;
}

export function RunwayProjection({
  projection,
  monthLabels,
  lineColor = "var(--color-brand)",
  baseline = null,
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

  // Recharts wants one row per x-value, so the two series get merged into a
  // single dataset rather than passed as separate data props.
  const data = projection.points.map((p, i) => ({
    month: p.month,
    balance: p.balance,
    baseline: baseline ? baseline.points[i]?.balance : undefined,
  }));

  return (
    <div ref={ref} className="w-full" style={{ height: CHART_HEIGHT }}>
      {width > 0 && (
        <LineChart
          width={width}
          height={CHART_HEIGHT}
          data={data}
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
          <Tooltip
            cursor={{ stroke: "var(--color-border-strong)", strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as {
                balance: number;
                baseline?: number;
              };
              return (
                <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-foreground-muted)]">
                    {monthLabels[Number(label)] ?? ""}
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-[var(--color-foreground)]">
                    {formatCurrency(row.balance, { showCents: false })}
                  </p>
                  {row.baseline !== undefined &&
                    Math.round(row.baseline) !== Math.round(row.balance) && (
                      <p className="mt-0.5 text-xs tabular-nums text-[var(--color-foreground-muted)]">
                        {formatCurrency(row.baseline, { showCents: false })} as
                        things stand
                      </p>
                    )}
                </div>
              );
            }}
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
          {/* Ghost of the real projection, drawn first so it sits behind. */}
          {baseline && (
            <Line
              type="monotone"
              dataKey="baseline"
              stroke="var(--color-border-strong)"
              strokeWidth={1.5}
              strokeDasharray="2 4"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
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
