/**
 * Local development fixtures — seeded data and a fake session, standing in
 * for Supabase.
 *
 * ## Why this exists
 *
 * Every screen past the landing page is behind Google OAuth, and Google
 * blocks sign-in inside embedded/automated browsers. That makes the whole
 * authenticated app unreachable when driving it with a headless browser, and
 * awkward to work on offline or without a Supabase project. This serves
 * seeded data instead, so the authed screens can be opened and screenshotted
 * directly — including states a single real account can't easily produce
 * (all four runway colours, an empty account, a failed write).
 *
 * ## How to use it
 *
 *   1. add `TALLY_DEV_FIXTURES=1` to `.env.local`
 *   2. `npm run dev`
 *   3. optionally set a `tally_fx` cookie to pick a scenario (see SCENARIOS);
 *      the default is `full`
 *
 * ## Why it cannot leak into production
 *
 * Every call site in `lib/supabase/` (`createClient` and `createStore` in
 * server.ts, and the session refresh in middleware.ts) tests
 * `process.env.NODE_ENV !== "production"` *before* the flag, as a literal
 * comparison. Next.js substitutes NODE_ENV at
 * build time, so in a production build that branch is statically false, the
 * `await import()` below it is unreachable, and this module is dropped from
 * the bundle entirely. Setting the flag on a deployed environment therefore
 * does nothing — it isn't a matter of the flag being respected, the code
 * isn't there.
 *
 * `npm run verify:no-fixtures` asserts exactly that against a real build.
 *
 * ## Keeping it honest
 *
 * The data is a plain in-memory store (lib/dev/memory-store.ts) that enforces
 * the same rules as the migrations: unique category names, the per-user row
 * caps, category ownership, the CHECK constraints. It sits behind the same
 * Store interface as the Supabase adapter, so there is no query language to
 * emulate and nothing for the fixtures to drift from but those rules. The auth
 * side only implements what the app calls and throws on anything else, since
 * a fixture that quietly answers an unknown call is worse than none.
 */

/** Grepped by scripts/assert-no-fixtures.mjs. Do not remove or reword. */
export const FIXTURE_BUILD_SENTINEL = "TALLY_DEV_FIXTURES_ACTIVE_SENTINEL";

export type Scenario =
  | "full"
  | "empty"
  | "new"
  | "critical"
  | "recurring"
  | "overcommitted"
  | "contractending"
  | "long"
  | "error"
  | "boom"
  | "unreadable"
  | "signedout";

export const SCENARIOS: readonly Scenario[] = [
  "full", // a healthy account with a month of history
  "empty", // onboarded, nothing logged yet
  "new", // not onboarded — lands on /onboarding
  "critical", // days of runway left
  "recurring", // exercises the standing-commitment maths
  "overcommitted", // standing commitments cost more than the income
  "contractending", // a second income stops partway through the projection
  "long", // long names and large amounts, for layout
  "error", // every write fails
  "boom", // every read throws — for the error boundaries
  "unreadable", // every read comes back as { error }, the way PostgREST reports one
  "signedout", // no session — lands on the landing page
] as const;

import {
  createMemoryStore,
  type CategoryRow,
  type IncomeSourceRow,
  type MemoryData,
  type TransactionRow,
} from "./memory-store";

const USER_ID = "00000000-0000-4000-8000-000000000001";

// ---------------------------------------------------------------- seed data

/** Deterministic PRNG, so a reload shows the same numbers. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - days);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Mirrors the preset rows seeded by migration 002. */
const PRESETS: ReadonlyArray<Omit<CategoryRow, "created_at" | "user_id">> = [
  { id: "cat-food", name: "Food & Drink", color: "#D4762C", icon: "utensils", is_preset: true },
  { id: "cat-groceries", name: "Groceries", color: "#059669", icon: "shopping-cart", is_preset: true },
  { id: "cat-housing", name: "Housing", color: "#5A8A9A", icon: "home", is_preset: true },
  { id: "cat-transport", name: "Transport", color: "#C49A0A", icon: "car", is_preset: true },
  { id: "cat-fun", name: "Entertainment", color: "#A0728A", icon: "tv", is_preset: true },
  { id: "cat-shopping", name: "Shopping", color: "#E89455", icon: "shopping-bag", is_preset: true },
  { id: "cat-health", name: "Health", color: "#DC2626", icon: "heart", is_preset: true },
  { id: "cat-utilities", name: "Utilities", color: "#6B7280", icon: "zap", is_preset: true },
];

function presetCategories(): CategoryRow[] {
  return PRESETS.map((p) => ({ ...p, user_id: null, created_at: isoDaysAgo(120) }));
}

const MERCHANTS: Record<string, ReadonlyArray<readonly [string, number, number]>> = {
  "cat-food": [["Blue Bottle", 5, 18], ["Sweetgreen", 12, 22], ["Thai Basil", 18, 46]],
  "cat-groceries": [["Trader Joe's", 32, 120], ["Whole Foods", 45, 160]],
  "cat-transport": [["MBTA", 2, 15], ["Uber", 11, 38], ["Shell", 40, 70]],
  "cat-fun": [["AMC Theatres", 16, 34]],
  "cat-shopping": [["Amazon", 14, 130], ["Uniqlo", 30, 95]],
  "cat-health": [["CVS Pharmacy", 8, 45]],
  "cat-utilities": [["Eversource", 60, 130]],
};

let sequence = 0;

function makeTransaction(
  daysAgo: number,
  amount: number,
  merchant: string | null,
  categoryId: string | null,
  recurrence = "once",
  description: string | null = null
): TransactionRow {
  const date = isoDaysAgo(daysAgo);
  return {
    id: `fx-tx-${++sequence}`,
    user_id: USER_ID,
    amount,
    description,
    merchant,
    category_id: categoryId,
    date,
    recurrence,
    created_at: `${date}T10:00:00.000Z`,
  };
}

/** A month of plausible one-off spending. */
function oneOffHistory(seed: number, scale = 1): TransactionRow[] {
  const rand = mulberry32(seed);
  const rows: TransactionRow[] = [];
  const catIds = Object.keys(MERCHANTS);

  for (let d = 1; d <= 30; d++) {
    if (rand() < 0.2) continue;
    const catId = catIds[Math.floor(rand() * catIds.length)];
    const pool = MERCHANTS[catId];
    const [merchant, lo, hi] = pool[Math.floor(rand() * pool.length)];
    const amount = Math.round((lo + rand() * (hi - lo)) * scale * 100) / 100;
    rows.push(makeTransaction(d, amount, merchant, catId));
  }

  return rows;
}

let incomeSequence = 0;

/** A salary, unless a scenario says otherwise. */
function salary(amount: number, name = "Salary"): IncomeSourceRow {
  return {
    id: `fx-inc-${++incomeSequence}`,
    user_id: USER_ID,
    name,
    amount,
    recurrence: "monthly",
    starts_on: null,
    ends_on: null,
    created_at: isoDaysAgo(120),
  };
}

/** A date `months` from now, on the last day of that month. */
function monthEndFromNow(months: number): string {
  const d = new Date();
  const end = new Date(d.getFullYear(), d.getMonth() + months + 1, 0);
  const m = String(end.getMonth() + 1).padStart(2, "0");
  return `${end.getFullYear()}-${m}-${String(end.getDate()).padStart(2, "0")}`;
}

function buildStore(scenario: Scenario): MemoryData {
  const categories = presetCategories();

  switch (scenario) {
    case "empty":
      return {
        profile: { id: USER_ID, savings_balance: 12000, onboarded: true },
        categories,
        incomeSources: [salary(3800)],
        transactions: [],
      };

    case "new":
      return {
        profile: { id: USER_ID, savings_balance: 0, onboarded: false },
        categories,
        incomeSources: [],
        transactions: [],
      };

    case "critical":
      return {
        profile: { id: USER_ID, savings_balance: 900, onboarded: true },
        categories,
        incomeSources: [salary(1200)],
        transactions: oneOffHistory(7, 2.2),
      };

    // Rent logged six months running (must count once, not six times), a
    // yearly bill last logged eight months ago (must still count), and two
    // subscriptions.
    case "recurring": {
      const rows: TransactionRow[] = [];
      for (let m = 0; m < 6; m++) {
        rows.push(makeTransaction(m * 30 + 2, 1850, "Greystar Rent", "cat-housing", "monthly", "Rent"));
      }
      rows.push(makeTransaction(240, 1200, "Geico", "cat-utilities", "yearly", "Car insurance"));
      rows.push(makeTransaction(4, 15.99, "Netflix", "cat-fun", "monthly"));
      rows.push(makeTransaction(3, 62, "MBTA", "cat-transport", "weekly", "Commuter pass"));
      rows.push(...oneOffHistory(11));
      return {
        profile: { id: USER_ID, savings_balance: 18400, onboarded: true },
        categories,
        incomeSources: [salary(4200)],
        transactions: rows,
      };
    }

    // Commitments alone outrun the income, so nothing is left before the
    // first coffee. The only scenario where "what's left over" goes negative.
    case "overcommitted": {
      const rows: TransactionRow[] = [
        makeTransaction(6, 2050, "Greystar Rent", "cat-housing", "monthly", "Rent"),
        makeTransaction(3, 62, "MBTA", "cat-transport", "weekly", "Commuter pass"),
        makeTransaction(150, 1200, "Geico", "cat-utilities", "yearly", "Car insurance"),
        makeTransaction(4, 89, "Blue Cross", "cat-health", "monthly", "Health plan"),
        makeTransaction(2, 15.99, "Netflix", "cat-fun", "monthly"),
        ...oneOffHistory(6),
      ];
      return {
        profile: { id: USER_ID, savings_balance: 5200, onboarded: true },
        categories,
        incomeSources: [salary(2200)],
        transactions: rows,
      };
    }

    // A retainer that stops in four months. Until then the balance holds;
    // after it, the projection should bend and start draining.
    case "contractending": {
      const retainer = salary(2600, "Acme retainer");
      retainer.ends_on = monthEndFromNow(3);
      return {
        profile: { id: USER_ID, savings_balance: 14000, onboarded: true },
        categories,
        incomeSources: [salary(1800), retainer],
        transactions: [
          makeTransaction(6, 1850, "Greystar Rent", "cat-housing", "monthly", "Rent"),
          ...oneOffHistory(9),
        ],
      };
    }

    case "long": {
      categories.push({
        id: "cat-fx-long",
        user_id: USER_ID,
        name: "Professional development and certifications",
        color: "#666A86",
        icon: "tag",
        is_preset: false,
        created_at: isoDaysAgo(10),
      });
      const rows = oneOffHistory(13);
      rows.push(
        makeTransaction(
          3,
          128450.75,
          "International Association of Certified Professionals",
          "cat-fx-long",
          "yearly",
          "Annual certification renewal plus conference travel and lodging"
        ),
        makeTransaction(1, 0.01, null, null)
      );
      return {
        profile: { id: USER_ID, savings_balance: 250000, onboarded: true },
        categories,
        incomeSources: [salary(9800)],
        transactions: rows,
      };
    }

    case "error":
    case "signedout":
    case "full":
    default: {
      categories.push({
        id: "cat-fx-books",
        user_id: USER_ID,
        name: "Books",
        color: "#666A86",
        icon: "tag",
        is_preset: false,
        created_at: isoDaysAgo(14),
      });
      const rows = oneOffHistory(42);
      rows.push(makeTransaction(2, 1850, "Greystar Rent", "cat-housing", "monthly", "Rent"));
      rows.push(makeTransaction(4, 15.99, "Netflix", "cat-fun", "monthly"));
      return {
        profile: { id: USER_ID, savings_balance: 18400, onboarded: true },
        categories,
        incomeSources: [salary(4200)],
        transactions: rows,
      };
    }
  }
}

// ---------------------------------------------------------------- store cache

/**
 * Parked on globalThis rather than at module scope: the dev server
 * re-evaluates modules between requests, and a plain module-level Map resets
 * mid-flow — which made a completed onboarding look unsaved and bounced
 * /dashboard back to /onboarding in a loop.
 */
const globalForFixtures = globalThis as unknown as {
  __tallyFixtureStores?: Map<string, MemoryData>;
  __tallyFixtureWarned?: boolean;
};

const stores =
  globalForFixtures.__tallyFixtureStores ??
  (globalForFixtures.__tallyFixtureStores = new Map<string, MemoryData>());

/**
 * The cookie may carry a nonce (`new:run7`) so an automated run can start
 * from a clean store without restarting the dev server. Everything before the
 * colon picks the scenario; the whole string keys the store.
 */
export function baseScenario(cookieValue: string): Scenario {
  const base = cookieValue.split(":")[0] as Scenario;
  return SCENARIOS.includes(base) ? base : "full";
}

function getStore(key: string, base: Scenario): MemoryData {
  let store = stores.get(key);
  if (!store) {
    store = buildStore(base);
    stores.set(key, store);
  }
  return store;
}

/** Drop a cached store so the next request rebuilds it. Used by tests. */
export function resetFixtureStores(): void {
  stores.clear();
}

// ---------------------------------------------------------------- auth stub

/**
 * Properties the runtime probes on arbitrary objects. `createClient` is async,
 * so `await createClient()` reads `.then` on whatever it returns to decide
 * whether it's a promise — throwing there would break the client on every
 * request. These have to answer `undefined`, not raise.
 */
const RUNTIME_PROBES = new Set([
  "then",
  "catch",
  "finally",
  "toJSON",
  "constructor",
  "$$typeof",
  "nodeType",
]);

/**
 * Throw on any property the stub doesn't implement, so a query the app grows
 * later fails loudly here instead of quietly returning no rows.
 */
function guardUnsupported<T extends object>(target: T, label: string): T {
  return new Proxy(target, {
    get(object, property, receiver) {
      if (typeof property === "symbol" || property in object) {
        return Reflect.get(object, property, receiver);
      }
      if (RUNTIME_PROBES.has(property)) return undefined;
      throw new Error(
        `[tally fixtures] ${label}.${String(property)} is not implemented in ` +
          `the dev fixture client. Add it to lib/dev/fixtures.ts, or unset ` +
          `TALLY_DEV_FIXTURES to run against a real Supabase project.`
      );
    },
  });
}

// ---------------------------------------------------------------- the client

export interface FixtureClientOptions {
  /** Raw `tally_fx` cookie value — `<scenario>` or `<scenario>:<nonce>`. */
  scenario: string;
}

/** Said once per process, the first time any fixture is handed out. */
function announceFixtures(): void {
  if (globalForFixtures.__tallyFixtureWarned) return;
  globalForFixtures.__tallyFixtureWarned = true;
  console.warn(
    `\n  \u26a0  ${FIXTURE_BUILD_SENTINEL}\n` +
      `     Supabase is stubbed with seeded data from lib/dev/fixtures.ts.\n` +
      `     Nothing is read from or written to a real database.\n` +
      `     Unset TALLY_DEV_FIXTURES in .env.local to use real data.\n`
  );
}

/**
 * The seeded data behind a scenario, live. Tests reach for it to set up a
 * state the store's own interface can't produce, such as a user whose
 * onboarding was never finished.
 */
export function fixtureData(scenario: string): MemoryData {
  return getStore(scenario, baseScenario(scenario));
}

/** The data side of the fixtures: a plain in-memory store over a scenario. */
export function createFixtureStore({ scenario }: FixtureClientOptions) {
  const base = baseScenario(scenario);
  announceFixtures();
  return createMemoryStore({
    viewerId: USER_ID,
    data: getStore(scenario, base),
    failWrites: base === "error",
    failReads: base === "boom" ? "throw" : base === "unreadable" ? "error" : undefined,
    latencyMs: 30,
  });
}

/**
 * The auth side of the fixtures: a signed-in (or signed-out, or failing) user
 * and nothing else. The data is `createFixtureStore`; there is no `from()`
 * here, and asking for one throws, so a page that reaches past the store
 * fails loudly instead of reading nothing.
 */
export function createFixtureAuthClient({ scenario }: FixtureClientOptions) {
  const base = baseScenario(scenario);
  const failReads = base === "boom";
  const signedOut = base === "signedout";

  announceFixtures();

  const auth = guardUnsupported(
    {
      async getUser() {
        // A real outage takes auth down with the database — Supabase Auth
        // is Postgres too. Without this, the landing page still resolves a
        // session and redirects, so app/error.tsx is unreachable.
        if (failReads) {
          throw new Error("[tally fixtures] simulated auth failure");
        }
        if (signedOut) return { data: { user: null }, error: null };
        return {
          data: {
            user: {
              id: USER_ID,
              email: "fixture@tally.dev",
              user_metadata: { full_name: "Alex Rivera", name: "Alex Rivera" },
            },
          },
          error: null,
        };
      },
      async signOut() {
        return { error: null };
      },
      async exchangeCodeForSession() {
        return { error: null };
      },
    },
    "auth"
  );

  return guardUnsupported({ auth }, "supabase");
}
