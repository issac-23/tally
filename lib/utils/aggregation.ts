/**
 * Pure helpers for grouping and comparing transactions.
 * No side effects, no Supabase, fully unit-testable.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

interface CategoryRef {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface TxLike {
  amount: number | string;
  date: string; // YYYY-MM-DD
  category?: CategoryRef | null;
}

export interface CategorySlice {
  category: CategoryRef;
  amount: number;
  share: number; // 0-1, fraction of the total
}

/**
 * Group a list of transactions by category and return them sorted
 * descending by amount. Transactions with no category are bucketed
 * into a synthetic "Uncategorized" entry.
 */
export function groupByCategory(transactions: TxLike[]): CategorySlice[] {
  const buckets = new Map<string, { category: CategoryRef; amount: number }>();

  const uncategorized: CategoryRef = {
    id: "__none",
    name: "Uncategorized",
    icon: "tag",
    color: "#9CA3AF",
  };

  for (const t of transactions) {
    const cat = t.category ?? uncategorized;
    const existing = buckets.get(cat.id);
    const amount = Number(t.amount);
    if (existing) {
      existing.amount += amount;
    } else {
      buckets.set(cat.id, { category: cat, amount });
    }
  }

  const total = Array.from(buckets.values()).reduce(
    (sum, b) => sum + b.amount,
    0
  );

  if (total === 0) return [];

  return Array.from(buckets.values())
    .map((b) => ({
      category: b.category,
      amount: b.amount,
      share: b.amount / total,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export interface PeriodComparison {
  current: number;
  prior: number;
  /** Null when prior was zero (can't divide by zero). */
  deltaPercent: number | null;
}

/**
 * Compare the most recent 30-day window against the prior 30-day window.
 *
 * "Now" defaults to new Date() but can be passed in for deterministic tests.
 */
export function comparePeriods(
  transactions: TxLike[],
  now: Date = new Date()
): PeriodComparison {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const currentStart = todayStart.getTime() - 30 * DAY_MS;
  const priorStart = todayStart.getTime() - 60 * DAY_MS;

  let current = 0;
  let prior = 0;

  for (const t of transactions) {
    // YYYY-MM-DD parsed as local midnight (matches spending util semantics).
    const [y, m, d] = t.date.split("-").map(Number);
    const ts = new Date(y, m - 1, d).getTime();
    const amount = Number(t.amount);

    if (ts >= currentStart) {
      current += amount;
    } else if (ts >= priorStart) {
      prior += amount;
    }
  }

  const deltaPercent =
    prior === 0 ? null : ((current - prior) / prior) * 100;

  return { current, prior, deltaPercent };
}
