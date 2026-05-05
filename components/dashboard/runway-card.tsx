import type { RunwayInfo, RunwayStatus } from "@/types";
import { formatCurrency } from "@/lib/utils/format";

interface RunwayCardProps {
  runway: RunwayInfo;
}

const statusStyles: Record<
  RunwayStatus,
  { bg: string; bar: string; fg: string; label: string }
> = {
  green: {
    bg: "var(--color-status-green-bg)",
    bar: "var(--color-status-green)",
    fg: "var(--color-status-green)",
    label: "Healthy",
  },
  yellow: {
    bg: "var(--color-status-yellow-bg)",
    bar: "var(--color-status-yellow)",
    fg: "var(--color-status-yellow)",
    label: "Watch closely",
  },
  orange: {
    bg: "var(--color-status-orange-bg)",
    bar: "var(--color-status-orange)",
    fg: "var(--color-status-orange)",
    label: "Getting tight",
  },
  red: {
    bg: "var(--color-status-red-bg)",
    bar: "var(--color-status-red)",
    fg: "var(--color-status-red)",
    label: "Critical",
  },
};

export function RunwayCard({ runway }: RunwayCardProps) {
  const styles = statusStyles[runway.status];

  // Bar fill: 0 months = 0%, 12+ months = 100%, linear in between.
  const barFillPercent = isFinite(runway.months_remaining)
    ? Math.min(100, Math.max(2, (runway.months_remaining / 12) * 100))
    : 100;

  return (
    <section
      className="rounded-2xl p-6 shadow-sm border"
      style={{
        backgroundColor: styles.bg,
        borderColor: styles.bar + "40",
      }}
    >
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-xs uppercase tracking-wide text-[var(--color-foreground-muted)] font-medium">
          Runway
        </p>
        <span
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: styles.fg }}
        >
          {styles.label}
        </span>
      </div>

      <p
        className="text-3xl font-bold mb-3"
        style={{ color: styles.fg }}
      >
        {runway.label}
      </p>

      {/* Progress bar */}
      <div
        className="h-2 rounded-full overflow-hidden bg-white/60 mb-3"
        aria-hidden
      >
        <div
          className="h-full rounded-full transition-all"
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
