/**
 * The account the public demo shows: an onboarded user with a savings
 * balance, two income sources, a few months of spending and the standing
 * commitments a real account has.
 *
 * Every date is worked out from `now` with the calendar module, so the
 * 30-day and 60-day windows, the runway and the projection are populated
 * whenever someone opens the demo, not just in the week this was written.
 * Nothing here is a literal date.
 *
 * The data goes straight into the in-memory store (lib/store/memory-store.ts),
 * which is a store adapter and not a dev fixture. This file must not import
 * from lib/dev: the production bundle is checked for that layer by
 * scripts/assert-no-fixtures.mjs.
 *
 * The merchants are made up on purpose, so nothing in the demo reads as a
 * real person's spending or an endorsement of a real business.
 */

import { addDays, dayKey, today } from "@/lib/utils/calendar";
import type {
  CategoryRow,
  IncomeSourceRow,
  MemoryData,
  TransactionRow,
} from "@/lib/store/memory-store";

/**
 * The demo user's id. All zeros apart from the version and variant digits
 * and a tail that spells out the purpose, so it can't be mistaken for a
 * real account: Supabase hands out random v4 ids.
 */
export const DEMO_USER_ID = "00000000-0000-4000-8000-00000000de40";

/** How far back the generated spending reaches, in days. */
const HISTORY_DAYS = 92;

/** The preset categories, as migration 002 seeds them. */
const PRESETS: ReadonlyArray<Omit<CategoryRow, "created_at" | "user_id">> = [
  { id: "demo-cat-food", name: "Food & Drink", color: "#D4762C", icon: "utensils", is_preset: true },
  { id: "demo-cat-groceries", name: "Groceries", color: "#059669", icon: "shopping-cart", is_preset: true },
  { id: "demo-cat-housing", name: "Housing", color: "#5A8A9A", icon: "home", is_preset: true },
  { id: "demo-cat-transport", name: "Transport", color: "#C49A0A", icon: "car", is_preset: true },
  { id: "demo-cat-fun", name: "Entertainment", color: "#A0728A", icon: "tv", is_preset: true },
  { id: "demo-cat-shopping", name: "Shopping", color: "#E89455", icon: "shopping-bag", is_preset: true },
  { id: "demo-cat-health", name: "Health", color: "#DC2626", icon: "heart", is_preset: true },
  { id: "demo-cat-utilities", name: "Utilities", color: "#6B7280", icon: "zap", is_preset: true },
];

const BOOKS = "demo-cat-books";
const PETS = "demo-cat-pets";

/** [merchant, lowest amount, highest amount] for each category a one-off can land in. */
const ONE_OFF_MERCHANTS: Record<string, ReadonlyArray<readonly [string, number, number]>> = {
  "demo-cat-food": [
    ["Harbor Coffee Co", 4, 14],
    ["Noodle House", 13, 32],
    ["Greenbowl Kitchen", 11, 19],
    ["Slice Brothers Pizza", 9, 28],
  ],
  "demo-cat-groceries": [
    ["Fresh Basket Grocers", 28, 110],
    ["Corner Market", 8, 36],
  ],
  "demo-cat-transport": [
    ["Cityline Transit", 2.5, 14],
    ["Bluebird Rides", 9, 34],
    ["Pinewood Fuel", 34, 62],
  ],
  "demo-cat-fun": [
    ["Pixel Cinema", 12, 31],
    ["Lantern Live Music", 22, 65],
  ],
  "demo-cat-shopping": [
    ["Threadbare Apparel", 24, 88],
    ["Homeware Depot", 12, 76],
  ],
  "demo-cat-health": [["Northside Pharmacy", 6, 38]],
  [BOOKS]: [["Maple Bookshop", 11, 36]],
  [PETS]: [["Paws & Whiskers Supply", 14, 58]],
};

/** Deterministic, so the demo looks the same on every visit. */
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The last day of the month `months` months after the one containing `now`. */
function monthEnd(now: Date, months: number): string {
  return dayKey(new Date(now.getFullYear(), now.getMonth() + months + 1, 0));
}

/**
 * A fresh copy of the demo account as of `now`. Each call builds its own
 * rows, so nothing is shared between requests.
 */
export function buildDemoData(now: Date = new Date()): MemoryData {
  const todayKey = today(now);
  const at = (daysBack: number) => addDays(todayKey, -daysBack);

  const categories: CategoryRow[] = [
    ...PRESETS.map((p) => ({ ...p, user_id: null, created_at: `${at(200)}T09:00:00.000Z` })),
    {
      id: BOOKS,
      user_id: DEMO_USER_ID,
      name: "Books",
      color: "#666A86",
      icon: "tag",
      is_preset: false,
      created_at: `${at(80)}T09:00:00.000Z`,
    },
    {
      id: PETS,
      user_id: DEMO_USER_ID,
      name: "Pets",
      color: "#8A7A4F",
      icon: "tag",
      is_preset: false,
      created_at: `${at(60)}T09:00:00.000Z`,
    },
  ];

  let txSequence = 0;
  function expense(
    daysBack: number,
    amount: number,
    merchant: string,
    categoryId: string,
    recurrence = "once",
    description: string | null = null
  ): TransactionRow {
    const n = ++txSequence;
    return {
      id: `demo-tx-${n}`,
      user_id: DEMO_USER_ID,
      amount,
      description,
      merchant,
      category_id: categoryId,
      date: at(daysBack),
      recurrence,
      // The sequence keeps two rows on one day in a stable order.
      created_at: `${at(daysBack)}T10:${String(n % 60).padStart(2, "0")}:00.000Z`,
    };
  }

  const transactions: TransactionRow[] = [];

  // Standing commitments. Each is logged for the months it has run, so the
  // list shows history while the maths counts every one of them once. The
  // insurance was last logged long before the spending window, which is
  // the case the commitments panel has to handle.
  for (const back of [4, 34, 65]) {
    transactions.push(expense(back, 1650, "Elmwood Apartments", "demo-cat-housing", "monthly", "Rent"));
  }
  for (const back of [9, 39, 70]) {
    transactions.push(expense(back, 15.99, "Streamline Video", "demo-cat-fun", "monthly"));
  }
  transactions.push(expense(12, 42, "Ironpeak Gym", "demo-cat-health", "monthly", "Membership"));
  transactions.push(expense(17, 45, "Ringtone Mobile", "demo-cat-utilities", "monthly", "Phone plan"));
  transactions.push(expense(21, 78.4, "Lumen Electric", "demo-cat-utilities", "monthly", "Electricity"));
  transactions.push(expense(200, 960, "Shieldwell Insurance", "demo-cat-utilities", "yearly", "Car insurance"));

  // Day-to-day spending, a day at a time, with some days off.
  const rand = mulberry32(2024);
  const categoryIds = Object.keys(ONE_OFF_MERCHANTS);
  for (let back = 0; back <= HISTORY_DAYS; back++) {
    if (rand() < 0.22) continue;
    // Most days one purchase, some days two.
    const count = rand() < 0.25 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const categoryId = categoryIds[Math.floor(rand() * categoryIds.length)];
      const pool = ONE_OFF_MERCHANTS[categoryId];
      const [merchant, low, high] = pool[Math.floor(rand() * pool.length)];
      const amount = Math.round((low + rand() * (high - low)) * 100) / 100;
      transactions.push(expense(back, amount, merchant, categoryId));
    }
  }

  const incomeSources: IncomeSourceRow[] = [
    {
      id: "demo-inc-1",
      user_id: DEMO_USER_ID,
      name: "Salary",
      amount: 3900,
      recurrence: "monthly",
      starts_on: null,
      ends_on: null,
      created_at: `${at(200)}T09:00:00.000Z`,
    },
    {
      // Stops in a few months, so the projection bends where it ends.
      id: "demo-inc-2",
      user_id: DEMO_USER_ID,
      name: "Freelance design",
      amount: 750,
      recurrence: "monthly",
      starts_on: null,
      ends_on: monthEnd(now, 3),
      created_at: `${at(150)}T09:00:00.000Z`,
    },
  ];

  return {
    profile: { id: DEMO_USER_ID, savings_balance: 14250, onboarded: true },
    categories,
    transactions,
    incomeSources,
  };
}
