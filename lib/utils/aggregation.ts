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
  merchant?: string | null;
}

// Merchant donut palette: warm + neutral tones, deliberately avoiding the
// status colors (red/green) so a merchant never looks like a warning.
const MERCHANT_PALETTE = [
  "#D4762C", // amber
  "#5A8A9A", // steel blue
  "#A0728A", // muted plum
  "#E89455", // coral
  "#6B7280", // neutral gray
  "#C49A0A", // ochre
  "#7C6A5A", // warm taupe
  "#9CA3AF", // light gray
];

export interface Slice {
  category: CategoryRef;
  amount: number;
  share: number; // 0-1, fraction of the total
}

/**
 * Group a list of transactions by category and return them sorted
 * descending by amount. Transactions with no category are bucketed
 * into a synthetic "Uncategorized" entry.
 */
export function groupByCategory(transactions: TxLike[]): Slice[] {
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

/**
 * Group a list of transactions by merchant string, sorted descending by amount.
 * Empty/null merchants go into "Unspecified". Returns the same Slice shape as
 * groupByCategory so the donut and breakdown components don't care which axis
 * they're rendering. Colors are assigned round-robin from a palette.
 */
export function groupByMerchant(transactions: TxLike[]): Slice[] {
  const buckets = new Map<string, number>();

  for (const t of transactions) {
    const merchant = (t.merchant ?? "").trim() || "Unspecified";
    const amount = Number(t.amount);
    buckets.set(merchant, (buckets.get(merchant) ?? 0) + amount);
  }

  const total = Array.from(buckets.values()).reduce((sum, v) => sum + v, 0);
  if (total === 0) return [];

  const sorted = Array.from(buckets.entries()).sort((a, b) => b[1] - a[1]);

  return sorted.map(([merchant, amount], i) => ({
    category: {
      id: `merchant:${merchant}`,
      name: merchant,
      icon: "store",
      color: MERCHANT_PALETTE[i % MERCHANT_PALETTE.length],
    },
    amount,
    share: amount / total,
  }));
}

export interface MonthGroup<T> {
  /** YYYY-MM, stable key for React and for sorting. */
  key: string;
  /** "August 2026" */
  label: string;
  total: number;
  transactions: T[];
}

/**
 * Bucket transactions into calendar months, preserving the order they arrive
 * in (the query already sorts newest-first). A flat list of every expense the
 * user has ever logged has no scannable structure — month headers with a
 * subtotal give the eye somewhere to land.
 */
export function groupByMonth<T extends { date: string; amount: number | string }>(
  transactions: T[]
): MonthGroup<T>[] {
  const groups = new Map<string, MonthGroup<T>>();

  for (const t of transactions) {
    const key = t.date.slice(0, 7); // YYYY-MM
    let group = groups.get(key);
    if (!group) {
      const [y, m] = key.split("-").map(Number);
      group = {
        key,
        label: new Date(y, m - 1, 1).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
        total: 0,
        transactions: [],
      };
      groups.set(key, group);
    }
    group.total += Number(t.amount);
    group.transactions.push(t);
  }

  return Array.from(groups.values());
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
