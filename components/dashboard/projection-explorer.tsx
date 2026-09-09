"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { RunwayProjection } from "@/components/charts/runway-projection";
import { formatCurrency } from "@/lib/utils/format";
import { calculateRunway } from "@/lib/utils/runway";
import { projectSavings, type SavingsProjection } from "@/lib/utils/projection";
import {
  formatMonthSpan,
  runwayDelta,
  sliderCeiling,
  sliderStep,
} from "@/lib/utils/scenario";

interface ProjectionExplorerProps {
  savings: number;
  monthlySalary: number;
  /** The real burn rate. The slider starts here and resets back to it. */
  monthlyAvgSpend: number;
  /** Pre-computed month labels, server-rendered so first paint is stable. */
  monthLabels: string[];
  hasSpendingData: boolean;
}

/**
 * "What if I spent less?" — the question the rest of the dashboard answers
 * only for today's numbers.
 *
 * All the maths is the same pure code the server uses (projectSavings,
 * calculateRunway), so dragging the slider is just re-running it with a
 * different spend figure. Nothing is persisted and nothing is fetched.
 */
export function ProjectionExplorer({
  savings,
  monthlySalary,
  monthlyAvgSpend,
  monthLabels,
  hasSpendingData,
}: ProjectionExplorerProps) {
  const [spend, setSpend] = useState(monthlyAvgSpend);

  const ceiling = useMemo(
    () => sliderCeiling(monthlyAvgSpend, monthlySalary),
    [monthlyAvgSpend, monthlySalary]
  );
  const step = useMemo(() => sliderStep(ceiling), [ceiling]);

  // Within half a step counts as "not moved", so the reset affordance and the
  // ghost line don't flicker on a rounding artefact.
  const isExploring = Math.abs(spend - monthlyAvgSpend) > step / 2;

  const baseRunway = calculateRunway(savings, monthlySalary, monthlyAvgSpend);
  const baseProjection = projectSavings(savings, monthlySalary, monthlyAvgSpend);

  const runway = isExploring
    ? calculateRunway(savings, monthlySalary, spend)
    : baseRunway;
  const projection = isExploring
    ? projectSavings(savings, monthlySalary, spend)
    : baseProjection;

  const delta = runwayDelta(
    baseRunway.months_remaining,
    runway.months_remaining
  );
  const spendDiff = spend - monthlyAvgSpend;

  return (
    <section className="rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 sm:p-6">
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="font-display text-h1 text-[var(--color-foreground)]">
          Savings projection
        </h2>
        {hasSpendingData || isExploring ? (
          <Caption projection={projection} />
        ) : (
          <span className="text-xs font-medium uppercase tracking-widest text-[var(--color-foreground-muted)]">
            Needs spending data
          </span>
        )}
      </div>

      <p className="mb-4 text-xs text-[var(--color-foreground-muted)]">
        {isExploring ? (
          <>
            Hypothetical: {formatCurrency(monthlySalary)}/mo income and{" "}
            {formatCurrency(spend)}/mo spending. The faint line is where you
            actually stand.
          </>
        ) : hasSpendingData ? (
          <>
            Based on {formatCurrency(monthlySalary)}/mo income and{" "}
            {formatCurrency(monthlyAvgSpend)}/mo average spending.
          </>
        ) : (
          <>
            Assumes {formatCurrency(monthlySalary)}/mo income and no spending
            yet — log expenses to see a real curve.
          </>
        )}
      </p>

      <RunwayProjection
        projection={projection}
        monthLabels={monthLabels}
        baseline={isExploring ? baseProjection : null}
        lineColor={
          projection.depletionMonth !== null
            ? "var(--color-status-red)"
            : "var(--color-status-green)"
        }
      />

      <div className="border-t border-[var(--color-border)] pt-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <label
            htmlFor="what-if-spend"
            className="text-xs font-medium uppercase tracking-widest text-[var(--color-foreground-muted)]"
          >
            What if I spent
          </label>
          {isExploring && (
            <button
              type="button"
              onClick={() => setSpend(monthlyAvgSpend)}
              className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs font-medium text-[var(--color-foreground-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]"
            >
              <RotateCcw size={12} aria-hidden />
              Reset
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <p className="text-2xl font-bold tabular-nums text-[var(--color-foreground)]">
            {/* Untouched, show the real figure. A range input snaps its value
                to the step, so `spend` starts a few dollars off the true burn
                rate and would disagree with the runway card. */}
            {formatCurrency(isExploring ? spend : monthlyAvgSpend, {
              showCents: false,
            })}
            <span className="ml-1 text-sm font-normal text-[var(--color-foreground-muted)]">
              /mo
            </span>
          </p>
          {isExploring && (
            <span
              className="text-sm font-medium tabular-nums"
              style={{
                color:
                  spendDiff < 0
                    ? "var(--color-status-green)"
                    : "var(--color-status-red)",
              }}
            >
              {spendDiff < 0 ? "−" : "+"}
              {formatCurrency(Math.abs(spendDiff), { showCents: false })}
            </span>
          )}
        </div>

        <input
          id="what-if-spend"
          type="range"
          min={0}
          max={ceiling}
          step={step}
          value={spend}
          onChange={(e) => setSpend(Number(e.target.value))}
          aria-describedby="what-if-result"
          className="mt-3 w-full"
        />
        <div
          className="mt-1 flex justify-between text-[10px] uppercase tracking-widest text-[var(--color-foreground-muted)]"
          aria-hidden
        >
          <span>{formatCurrency(0, { showCents: false })}</span>
          <span>{formatCurrency(ceiling, { showCents: false })}</span>
        </div>

        {/* aria-live so a screen reader hears the outcome, not just the value */}
        <p
          id="what-if-result"
          aria-live="polite"
          className="mt-3 text-sm leading-relaxed text-[var(--color-foreground-muted)]"
        >
          {!hasSpendingData && !isExploring ? (
            <>Drag to see how a spending habit would shape your runway.</>
          ) : (
            <>
              <span className="font-medium text-[var(--color-foreground)]">
                {runway.label}
              </span>
              {delta.kind === "gain" && (
                <>
                  {" — "}
                  <span className="font-medium text-[var(--color-status-green)]">
                    {formatMonthSpan(delta.months)} longer
                  </span>{" "}
                  than your current pace.
                </>
              )}
              {delta.kind === "loss" && (
                <>
                  {" — "}
                  <span className="font-medium text-[var(--color-status-red)]">
                    {formatMonthSpan(delta.months)} shorter
                  </span>{" "}
                  than your current pace.
                </>
              )}
              {delta.kind === "becomes-indefinite" && (
                <>
                  {" — "}you&apos;d be saving rather than drawing down.
                </>
              )}
              {delta.kind === "loses-indefinite" && (
                <>
                  {" — "}you&apos;d start drawing down instead of saving.
                </>
              )}
              {delta.kind === "both-indefinite" && isExploring && (
                <>
                  {" — "}
                  <span
                    className="font-medium"
                    style={{
                      color:
                        spendDiff < 0
                          ? "var(--color-status-green)"
                          : "var(--color-status-red)",
                    }}
                  >
                    {formatCurrency(Math.abs(spendDiff), { showCents: false })}
                    /mo {spendDiff < 0 ? "more" : "less"}
                  </span>{" "}
                  into savings than your current pace.
                </>
              )}
              {(delta.kind === "same" || delta.kind === "both-indefinite") &&
                !isExploring && <> at your current pace.</>}
            </>
          )}
        </p>
      </div>
    </section>
  );
}

function Caption({ projection }: { projection: SavingsProjection }) {
  if (projection.depletionMonth !== null) {
    const months = Math.round(projection.depletionMonth * 10) / 10;
    return (
      <span className="text-xs font-medium uppercase tracking-widest text-[var(--color-status-red)]">
        Depletes in ~{months} months
      </span>
    );
  }
  if (projection.monthlyNet > 0) {
    return (
      <span className="text-xs font-medium uppercase tracking-widest text-[var(--color-status-green)]">
        On track to keep saving
      </span>
    );
  }
  return (
    <span className="text-xs font-medium uppercase tracking-widest text-[var(--color-foreground-muted)]">
      Holding steady
    </span>
  );
}
