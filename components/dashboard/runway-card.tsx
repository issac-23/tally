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

/**
 * The runway status is the one thing this product exists to tell you, so the
 * four states have to be distinguishable at a glance — not by a 3px rule and
 * a line of small caps. Healthy stays calm on the raised surface; the three
 * worsening states progressively take over the card with their own tint.
 */
const statusStyles: Record<
  RunwayStatus,
  { fg: string; tint: string; label: string; alarm: boolean }
> = {
  green: {
    fg: "var(--color-status-green)",
    tint: "var(--color-surface-raised)",
    label: "Healthy",
    alarm: false,
  },
  yellow: {
    fg: "var(--color-status-yellow)",
    tint: "var(--color-status-yellow-bg)",
    label: "Watch closely",
    alarm: false,
  },
  orange: {
    fg: "var(--color-status-orange)",
    tint: "var(--color-status-orange-bg)",
    label: "Getting tight",
    alarm: true,
  },
  red: {
    fg: "var(--color-status-red)",
    tint: "var(--color-status-red-bg)",
    label: "Critical",
    alarm: true,
  },
};

/** One plain sentence naming what the status actually means for the user. */
function statusMessage(runway: RunwayInfo): string {
  const over = runway.monthly_avg_spend - runway.monthly_budget_limit;

  switch (runway.status) {
    case "green":
      return "You're spending less than you bring in.";
    case "yellow":
      return over > 0
        ? `You're ${formatCurrency(over)}/mo above a sustainable pace.`
        : "Comfortable, but the margin is thin.";
    case "orange":
      return over > 0
        ? `Spending is ${formatCurrency(over)}/mo more than you can keep up.`
        : "Savings are draining faster than they're replaced.";
    case "red":
      return "At this rate your savings run out within the month.";
  }
}

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
    <section className="overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)]">
      {/* Status band. Carries the tint so a critical runway can't be mistaken
          for a healthy one at a glance. */}
      <div className="p-6" style={{ backgroundColor: styles.tint }}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-foreground-muted)]">
            Runway
          </p>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-widest ${
              styles.alarm ? "text-white" : ""
            }`}
            style={
              styles.alarm
                ? { backgroundColor: styles.fg }
                : { color: styles.fg, backgroundColor: "transparent" }
            }
          >
            {styles.label}
          </span>
        </div>

        <p
          className="text-3xl font-bold tabular-nums"
          style={{ color: styles.alarm ? styles.fg : "var(--color-foreground)" }}
        >
          {runway.label}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
          {statusMessage(runway)}
        </p>

        {/* Flat progress track + fill (no inner radius for the editorial look). */}
        <div
          className="mt-5 h-1.5 overflow-hidden bg-[var(--color-surface)]"
          aria-hidden
        >
          <div
            className="h-full transition-all"
            style={{
              width: `${barFillPercent}%`,
              backgroundColor: styles.fg,
            }}
          />
        </div>
      </div>

      {/* Recommended budget + current spend, two-column footer */}
      <div className="grid grid-cols-2 gap-4 border-t border-[var(--color-border)] p-6">
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
          <p
            className="font-display text-h1 mt-1"
            style={{
              color: styles.alarm
                ? styles.fg
                : "var(--color-foreground)",
            }}
          >
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
        <span className="text-xs font-medium uppercase tracking-widest text-[var(--color-foreground-muted)]">
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
          className="btn-primary mt-4 px-3 py-2 text-sm"
        >
          Log your first expense
        </Link>
      </div>
    </section>
  );
}
