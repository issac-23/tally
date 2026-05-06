/**
 * Spending aggregations from a list of transactions.
 * All amounts are positive numbers (expenses).
 */

interface AmountDated {
  amount: number | string;
  date: string; // YYYY-MM-DD
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setTime(d.getTime() - n * DAY_MS);
  return d;
}

function isOnOrAfter(dateStr: string, threshold: Date): boolean {
  // YYYY-MM-DD must be parsed as local midnight to match the threshold's
  // local-time semantics. `new Date("2026-05-15")` treats the string as
  // UTC midnight, which would silently exclude "today" for any user
  // in a timezone west of UTC.
  const [year, month, day] = dateStr.split("-").map(Number);
  const local = new Date(year, month - 1, day);
  return local.getTime() >= threshold.getTime();
}

/**
 * Total spent in the last 30 days. Used as the baseline for runway math.
 * Returns 0 if there are no transactions in the window.
 */
export function monthlyAverageSpend(transactions: AmountDated[]): number {
  const cutoff = daysAgo(30);
  return transactions
    .filter((t) => isOnOrAfter(t.date, cutoff))
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

/**
 * Today / this week (last 7 days) / this month (last 30 days) totals.
 */
export function spendingSummary(transactions: AmountDated[]): {
  today: number;
  this_week: number;
  this_month: number;
} {
  const todayStart = daysAgo(0);
  const weekStart = daysAgo(7);
  const monthStart = daysAgo(30);

  let today = 0;
  let thisWeek = 0;
  let thisMonth = 0;

  for (const t of transactions) {
    const amount = Number(t.amount);
    if (isOnOrAfter(t.date, todayStart)) today += amount;
    if (isOnOrAfter(t.date, weekStart)) thisWeek += amount;
    if (isOnOrAfter(t.date, monthStart)) thisMonth += amount;
  }

  return { today, this_week: thisWeek, this_month: thisMonth };
}
