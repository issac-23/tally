import {
  projectionScale,
  type ProjectionScale,
  type SavingsProjection,
} from "@/lib/utils/projection";
import { ProjectionExplorer } from "@/components/dashboard/projection-explorer";

interface SavingsProjectionSectionProps {
  projection: SavingsProjection;
  savings: number;
  monthlyIncome: number;
  incomeSchedule: number[];
  monthlyAvgSpend: number;
  /** See RunwayCard — no spending logged means no honest projection. */
  hasSpendingData?: boolean;
}

/**
 * Server wrapper. Its only job is to pick the window and build its labels off
 * the server's clock so first paint is stable, then hand the numbers to the
 * client explorer — which owns the card, because everything in it (the
 * caption included) has to move with the slider.
 *
 * The scale is chosen once, from the real projection, and then held while the
 * slider moves. Re-picking it per drag would rescale the x-axis underneath
 * the ghost line and make the two impossible to compare.
 */
export function SavingsProjectionSection({
  projection,
  savings,
  monthlyIncome,
  incomeSchedule,
  monthlyAvgSpend,
  hasSpendingData = true,
}: SavingsProjectionSectionProps) {
  const scale = projectionScale(projection.depletionMonth);

  return (
    <ProjectionExplorer
      savings={savings}
      monthlyIncome={monthlyIncome}
      incomeSchedule={incomeSchedule}
      monthlyAvgSpend={monthlyAvgSpend}
      scale={scale}
      monthLabels={buildLabels(scale)}
      hasSpendingData={hasSpendingData}
    />
  );
}

const DAYS_PER_MONTH = 30.44;

/**
 * "Now, May, Jun, Jul..." for a monthly window, "Now, Oct 3, Oct 6..." for the
 * finer ones. Server-rendered so the labels are stable on first paint.
 */
function buildLabels(scale: ProjectionScale): string[] {
  const now = new Date();
  const labels = ["Now"];

  for (let i = 1; i <= scale.periods; i++) {
    if (scale.unit === "month") {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      labels.push(d.toLocaleDateString("en-US", { month: "short" }));
      continue;
    }
    // Step in whole days off today rather than adding months, so a window
    // that starts on the 31st doesn't roll into the month after next.
    const d = new Date(now);
    d.setDate(d.getDate() + Math.round(i * scale.periodMonths * DAYS_PER_MONTH));
    labels.push(
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    );
  }

  return labels;
}
