import Link from "next/link";
import type { RunwayInfo, RunwayStatus } from "@/types";
import { formatCurrency } from "@/lib/utils/format";

interface RunwayCardProps {
  runway: RunwayInfo;
  /**
   * False when the user has logged no spending in the runway window. Without
   * a burn rate the math technically returns "infinite runway", but stating
   * that as a healthy result is a claim we haven't earned — so we show an
   * explicit needs-data state instead.
   */
  hasSpendingData?: boolean;
}

const statusStyles: Record<
  RunwayStatus,
  { bar: string; fg: string; label: string }
> = {
  green: {
    bar: "var(--color-status-green)",
    fg: "var(--color-status-green)",
    label: "Healthy",
  },
  yellow: {
    bar: "var(--color-status-yellow)",
    fg: "var(--color-status-yellow)",
    label: "Watch closely",
  },
  orange: {
    bar: "var(--color-status-orange)",
    fg: "var(--color-status-orange)",
    label: "Getting tight",
  },
  red: {
    bar: "var(--color-status-red)",
    fg: "var(--color-status-red)",
    label: "Critical",
  },
};

export function RunwayCard({
  runway,
  hasSpendingData = true,
}: RunwayCardProps) {
  if (!hasSpendingData) {
    return <RunwayNeedsData runway={runway} />;
  }

  const styles = statusStyles[runway.status];

  // Bar fill: 0 months -> 0%, 12+ months -> 100%, linear in between.
  const barFillPercent = isFinite(runway.months_remaining)
    ? Math.min(100, Math.max(2, (runway.months_remaining / 12) * 100))
    : 100;

  return (
    <section
      className="rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 border-l-[3px]"
      style={{ borderLeftColor: styles.bar }}
    >
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-xs uppercase tracking-widest text-[var(--color-foreground-muted)] font-medium">
          Runway
        </p>
        <span
          className="text-xs font-medium uppercase tracking-widest"
          style={{ color: styles.fg }}
        >
          {styles.label}
        </span>
      </div>

      <p className="text-3xl font-bold mb-4 text-[var(--color-foreground)]">
        {runway.label}
      </p>

      {/* Flat progress track + fill (no inner radius for the editorial look). */}
      <div
        className="h-1.5 bg-[var(--color-surface)] mb-5 overflow-hidden"
        aria-hidden
      >
        <div
          className="h-full transition-all"
          style={{
            width: `${barFillPercent}%`,
            backgroundColor: styles.bar,
          }}
        />
      </div>

      {/* Recommended budget + current spend, two-column footer */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--color-border)]">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--color-foreground-muted)] font-medium">
            Recommended budget
          </p>
          <p className="font-display text-h1 text-[var(--color-foreground)] mt-1">
            {formatCurrency(runway.monthly_budget_limit)}
            <span className="text-sm text-[var(--color-foreground-muted)] font-sans ml-1">/mo</span>
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--color-foreground-muted)] font-medium">
            Currently spending
          </p>
          <p className="font-display text-h1 text-[var(--color-foreground)] mt-1">
            {formatCurrency(runway.monthly_avg_spend)}
            <span className="text-sm text-[var(--color-foreground-muted)] font-sans ml-1">/mo</span>
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Shown until there's spending to measure. States the one thing we do know
 * (the sustainable budget, which only needs savings + salary) and asks for
 * the input that unlocks the rest.
 */
function RunwayNeedsData({ runway }: { runway: RunwayInfo }) {
  return (
    <section className="rounded border border-[var(--color-border)] border-l-[3px] border-l-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-6">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-foreground-muted)]">
          Runway
        </p>
        <span className="text-xs font-medium uppercase tracking-widest text-[var(--color-foreground-subtle)]">
          Needs data
        </span>
      </div>

      <p className="mb-2 text-3xl font-bold text-[var(--color-foreground)]">
        Not yet
      </p>
      <p className="mb-5 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
        Log a few expenses and Tally will work out how long your savings last
        at that rate.
      </p>

      <div className="border-t border-[var(--color-border)] pt-4">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-foreground-muted)]">
          Sustainable budget
        </p>
        <p className="font-display text-h1 mt-1 text-[var(--color-foreground)]">
          {formatCurrency(runway.monthly_budget_limit)}
          <span className="ml-1 font-sans text-sm text-[var(--color-foreground-muted)]">
            /mo
          </span>
        </p>
        <Link
          href="/transactions/new"
          className="mt-4 inline-flex rounded bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand-light)]"
        >
          Log your first expense
        </Link>
      </div>
    </section>
  );
}
