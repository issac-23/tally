/**
 * How often an expense repeats, and what that costs per month.
 *
 * A one-off expense only matters while it sits inside the 30-day spending
 * window. A recurring one is a standing commitment: rent is $1,850 every
 * month whether or not it happens to fall inside the window, and a $1,200
 * yearly insurance bill is really $100/mo rather than a spike that craters
 * your runway the day you log it.
 */

import { DAYS_PER_MONTH } from "./calendar";

export type Recurrence =
  | "once"
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "semiannual"
  | "yearly";

export interface RecurrenceOption {
  value: Recurrence;
  /** Shown in the picker. */
  label: string;
  /** Shown on a transaction row. Empty for one-off. */
  badge: string;
  /** How many times this happens in an average month. */
  perMonth: number;
}

const WEEKS_PER_MONTH = DAYS_PER_MONTH / 7;

export const RECURRENCE_OPTIONS: RecurrenceOption[] = [
  { value: "once", label: "One-off", badge: "", perMonth: 0 },
  { value: "daily", label: "Every day", badge: "Daily", perMonth: DAYS_PER_MONTH },
  { value: "weekly", label: "Every week", badge: "Weekly", perMonth: WEEKS_PER_MONTH },
  {
    value: "biweekly",
    label: "Every 2 weeks",
    badge: "Every 2 weeks",
    perMonth: WEEKS_PER_MONTH / 2,
  },
  { value: "monthly", label: "Every month", badge: "Monthly", perMonth: 1 },
  { value: "quarterly", label: "Every 3 months", badge: "Quarterly", perMonth: 1 / 3 },
  { value: "semiannual", label: "Every 6 months", badge: "Every 6 months", perMonth: 1 / 6 },
  { value: "yearly", label: "Every year", badge: "Yearly", perMonth: 1 / 12 },
];

const BY_VALUE = new Map(RECURRENCE_OPTIONS.map((o) => [o.value, o]));

export function isRecurrence(value: unknown): value is Recurrence {
  return typeof value === "string" && BY_VALUE.has(value as Recurrence);
}

export function recurrenceOption(value: string | null | undefined) {
  return BY_VALUE.get((value ?? "once") as Recurrence) ?? BY_VALUE.get("once")!;
}

export function recurrenceLabel(value: string | null | undefined): string {
  return recurrenceOption(value).label;
}

/** Badge text for a transaction row. Empty string for one-off expenses. */
export function recurrenceBadge(value: string | null | undefined): string {
  return recurrenceOption(value).badge;
}

/** What this expense costs per month. One-off expenses return 0. */
export function monthlyEquivalent(
  amount: number | string,
  recurrence: string | null | undefined
): number {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return n * recurrenceOption(recurrence).perMonth;
}

interface RecurringLike {
  amount: number | string;
  date: string; // YYYY-MM-DD
  merchant?: string | null;
  recurrence?: string | null;
  category?: { id: string } | null;
  category_id?: string | null;
  /** From this day the commitment no longer counts. */
  ends_on?: string | null;
}

function categoryKey(t: Pick<RecurringLike, "category" | "category_id">): string {
  return t.category?.id ?? t.category_id ?? "";
}

/**
 * Collapse repeated logs of the same commitment into one series.
 *
 * Someone who logs rent every month ends up with twelve rows that all say
 * "monthly", and counting each of them would claim $22,200/mo of rent. A
 * series is keyed on what identifies the commitment — how often, which
 * category, which merchant — deliberately *not* on the amount, so a rent
 * increase updates the series instead of creating a second one.
 *
 * The most recent row in each series wins, which is what makes that work.
 */
export function recurringSeries<T extends RecurringLike>(
  transactions: T[],
  asOf?: string
): T[] {
  const latest = new Map<string, T>();

  for (const t of transactions) {
    if (recurrenceOption(t.recurrence).perMonth === 0) continue;

    const key = seriesKey(t);

    const current = latest.get(key);
    // Ties on date keep the first seen, which is the newest because the
    // queries already sort by date then created_at descending.
    if (!current || t.date > current.date) {
      latest.set(key, t);
    }
  }

  // Ended is decided on the newest row, after the winner is picked: filtering
  // first would let an older row of a stopped series count again.
  return Array.from(latest.values()).filter(
    (t) => !asOf || !t.ends_on || t.ends_on > asOf
  );
}

/** What makes two rows the same commitment. Deliberately not the amount. */
export function seriesKey(
  t: Pick<RecurringLike, "recurrence" | "merchant" | "category" | "category_id">
): string {
  return [
    t.recurrence ?? "once",
    categoryKey(t),
    (t.merchant ?? "").trim().toLowerCase(),
  ].join("|");
}

/** Total monthly cost of every standing commitment. */
export function recurringMonthlyTotal(
  transactions: RecurringLike[],
  asOf?: string
): number {
  return recurringSeries(transactions, asOf).reduce(
    (sum, t) => sum + monthlyEquivalent(t.amount, t.recurrence),
    0
  );
}
