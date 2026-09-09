/**
 * Helpers for the what-if explorer on the dashboard.
 *
 * The projection maths already lives in projection.ts and runway.ts as pure
 * functions, so exploring a hypothetical is only a matter of feeding them a
 * different spend figure. These helpers decide what range that figure can
 * move through, and how to describe the result.
 */

/**
 * Upper bound for the spending slider.
 *
 * Has to comfortably clear the user's current spend so they can explore
 * spending *more*, stay usable when they have barely any history, and land
 * on a round number so the track reads sensibly. Rounds up to 1, 2 or 5
 * times a power of ten.
 */
export function sliderCeiling(
  monthlySpend: number,
  monthlySalary: number
): number {
  const target = Math.max(monthlySpend * 2, monthlySalary * 1.5, 500);
  const magnitude = 10 ** Math.floor(Math.log10(target));

  for (const step of [1, 2, 5, 10]) {
    const candidate = step * magnitude;
    if (candidate >= target) return candidate;
  }
  return 10 * magnitude;
}

/** Step size that gives the slider ~100 stops on a round number. */
export function sliderStep(ceiling: number): number {
  const raw = ceiling / 100;
  const magnitude = 10 ** Math.floor(Math.log10(raw));

  for (const step of [1, 2, 5, 10]) {
    const candidate = step * magnitude;
    if (candidate >= raw) return candidate;
  }
  return 10 * magnitude;
}

/**
 * Describe the change in runway between the real figure and a hypothetical.
 *
 * Both sides can be Infinity (spending less than you earn), so the wording
 * has to cope with "already indefinite", "becomes indefinite", and "stops
 * being indefinite" rather than just subtracting.
 */
export function runwayDelta(
  baseMonths: number,
  nextMonths: number
): {
  kind:
    | "same"
    | "both-indefinite"
    | "gain"
    | "loss"
    | "becomes-indefinite"
    | "loses-indefinite";
  months: number;
} {
  const baseInf = !isFinite(baseMonths);
  const nextInf = !isFinite(nextMonths);

  // Both indefinite isn't "no change" — you can still be putting more or less
  // into savings each month, so the caller needs to tell this apart from a
  // finite runway that barely moved.
  if (baseInf && nextInf) return { kind: "both-indefinite", months: 0 };
  if (nextInf) return { kind: "becomes-indefinite", months: 0 };
  if (baseInf) return { kind: "loses-indefinite", months: nextMonths };

  const diff = nextMonths - baseMonths;
  // Under a tenth of a month is noise at this precision.
  if (Math.abs(diff) < 0.05) return { kind: "same", months: 0 };
  return { kind: diff > 0 ? "gain" : "loss", months: Math.abs(diff) };
}

/** "3.4 months" / "18 days" — matches the runway card's own phrasing. */
export function formatMonthSpan(months: number): string {
  if (months < 1) {
    const days = Math.max(1, Math.round(months * 30));
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  const rounded = Math.round(months * 10) / 10;
  return `${rounded} month${rounded === 1 ? "" : "s"}`;
}
