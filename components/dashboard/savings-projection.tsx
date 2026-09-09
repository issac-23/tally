import type { SavingsProjection } from "@/lib/utils/projection";
import { ProjectionExplorer } from "@/components/dashboard/projection-explorer";

interface SavingsProjectionSectionProps {
  projection: SavingsProjection;
  savings: number;
  monthlySalary: number;
  monthlyAvgSpend: number;
  /** See RunwayCard — no spending logged means no honest projection. */
  hasSpendingData?: boolean;
}

/**
 * Server wrapper. Its only job is to build the month labels off the server's
 * clock so first paint is stable, then hand the numbers to the client
 * explorer — which owns the card, because everything in it (the caption
 * included) has to move with the slider.
 */
export function SavingsProjectionSection({
  projection,
  savings,
  monthlySalary,
  monthlyAvgSpend,
  hasSpendingData = true,
}: SavingsProjectionSectionProps) {
  return (
    <ProjectionExplorer
      savings={savings}
      monthlySalary={monthlySalary}
      monthlyAvgSpend={monthlyAvgSpend}
      monthLabels={buildMonthLabels(projection.points.length)}
      hasSpendingData={hasSpendingData}
    />
  );
}

/**
 * Build "Now, May, Jun, Jul..." labels anchored at today's month.
 * Server-rendered so the labels are stable on first paint.
 */
function buildMonthLabels(count: number): string[] {
  const now = new Date();
  const labels: string[] = [];
  for (let i = 0; i < count; i++) {
    if (i === 0) {
      labels.push("Now");
      continue;
    }
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    labels.push(d.toLocaleDateString("en-US", { month: "short" }));
  }
  return labels;
}
