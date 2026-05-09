import type { RunwayInfo, RunwayStatus } from "@/types";
import { formatCurrency } from "@/lib/utils/format";

interface RunwayCardProps {
  runway: RunwayInfo;
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

export function RunwayCard({ runway }: RunwayCardProps) {
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
        <p className="text-xs uppercase tracking-wider text-[var(--color-foreground-muted)] font-medium">
          Runway
        </p>
        <span
          className="text-xs font-medium uppercase tracking-wider"
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
        className="h-1.5 bg-[var(--color-surface)] mb-3 overflow-hidden"
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

      <p className="text-xs text-[var(--color-foreground-muted)]">
        Spending {formatCurrency(runway.monthly_avg_spend)}/mo
        {" · "}
        Sustainable budget {formatCurrency(runway.monthly_budget_limit)}/mo
      </p>
    </section>
  );
}
