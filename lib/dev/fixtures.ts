/**
 * Local development fixtures — a stand-in for the Supabase client.
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
 * Both call sites in `lib/supabase/` test `process.env.NODE_ENV !== "production"`
 * *before* the flag, as a literal comparison. Next.js substitutes NODE_ENV at
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
 * This implements only the slice of the Supabase query API the app actually
 * calls. Anything else throws loudly rather than returning empty data — a
 * fixture that silently answers "no rows" to a query it doesn't understand is
 * worse than no fixture at all, because the UI renders a plausible empty
 * state and nothing looks wrong.
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
  | "long"
  | "error"
  | "signedout";

export const SCENARIOS: readonly Scenario[] = [
  "full", // a healthy account with a month of history
  "empty", // onboarded, nothing logged yet
  "new", // not onboarded — lands on /onboarding
  "critical", // days of runway left
  "recurring", // exercises the standing-commitment maths
  "overcommitted", // standing commitments cost more than the income
  "long", // long names and large amounts, for layout
  "error", // every write fails
  "signedout", // no session — lands on the landing page
] as const;

const USER_ID = "00000000-0000-4000-8000-000000000001";

// ---------------------------------------------------------------- row shapes

interface CategoryRow {
  id: string;
  user_id: string | null;
  name: string;
  color: string;
  icon: string;
  is_preset: boolean;
  created_at: string;
}

interface TransactionRow {
  id: string;
  user_id: string;
  amount: number;
  description: string | null;
  merchant: string | null;
  category_id: string | null;
  date: string;
  recurrence: string;
  created_at: string;
}

interface ProfileRow {
  id: string;
  savings_balance: number;
  monthly_salary: number;
  onboarded: boolean;
}

interface Store {
  profile: ProfileRow;
  categories: CategoryRow[];
  transactions: TransactionRow[];
}

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

function buildStore(scenario: Scenario): Store {
  const categories = presetCategories();

  switch (scenario) {
    case "empty":
      return {
        profile: { id: USER_ID, savings_balance: 12000, monthly_salary: 3800, onboarded: true },
        categories,
        transactions: [],
      };

    case "new":
      return {
        profile: { id: USER_ID, savings_balance: 0, monthly_salary: 0, onboarded: false },
        categories,
        transactions: [],
      };

    case "critical":
      return {
        profile: { id: USER_ID, savings_balance: 900, monthly_salary: 1200, onboarded: true },
        categories,
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
        profile: { id: USER_ID, savings_balance: 18400, monthly_salary: 4200, onboarded: true },
        categories,
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
        profile: { id: USER_ID, savings_balance: 5200, monthly_salary: 2200, onboarded: true },
        categories,
        transactions: rows,
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
        profile: { id: USER_ID, savings_balance: 250000, monthly_salary: 9800, onboarded: true },
        categories,
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
        profile: { id: USER_ID, savings_balance: 18400, monthly_salary: 4200, onboarded: true },
        categories,
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
  __tallyFixtureStores?: Map<string, Store>;
  __tallyFixtureWarned?: boolean;
};

const stores =
  globalForFixtures.__tallyFixtureStores ??
  (globalForFixtures.__tallyFixtureStores = new Map<string, Store>());

/**
 * The cookie may carry a nonce (`new:run7`) so an automated run can start
 * from a clean store without restarting the dev server. Everything before the
 * colon picks the scenario; the whole string keys the store.
 */
export function baseScenario(cookieValue: string): Scenario {
  const base = cookieValue.split(":")[0] as Scenario;
  return SCENARIOS.includes(base) ? base : "full";
}

function getStore(key: string, base: Scenario): Store {
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

// ---------------------------------------------------------------- query stub

type Row = Record<string, unknown>;
type FilterOp = "eq" | "neq" | "gte";
interface Filter {
  op: FilterOp;
  column: string;
  value: unknown;
}

const WRITE_FAILURE = {
  message: "Fixture mode: simulated database failure.",
  code: "FX500",
};

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

class QueryBuilder implements PromiseLike<{ data: unknown; error: unknown }> {
  private filters: Filter[] = [];
  private orderings: Array<{ column: string; ascending: boolean }> = [];
  private rowLimit: number | null = null;
  private columns = "*";
  private mode: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private payload: Row | null = null;

  constructor(
    private readonly table: string,
    private readonly store: Store,
    private readonly failWrites: boolean
  ) {}

  select(columns = "*") {
    this.columns = columns;
    return this;
  }
  insert(payload: Row) {
    this.mode = "insert";
    this.payload = payload;
    return this;
  }
  upsert(payload: Row) {
    this.mode = "upsert";
    this.payload = payload;
    return this;
  }
  update(payload: Row) {
    this.mode = "update";
    this.payload = payload;
    return this;
  }
  delete() {
    this.mode = "delete";
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push({ op: "eq", column, value });
    return this;
  }
  neq(column: string, value: unknown) {
    this.filters.push({ op: "neq", column, value });
    return this;
  }
  gte(column: string, value: unknown) {
    this.filters.push({ op: "gte", column, value });
    return this;
  }
  order(column: string, options: { ascending?: boolean } = {}) {
    this.orderings.push({ column, ascending: options.ascending !== false });
    return this;
  }
  limit(count: number) {
    this.rowLimit = count;
    return this;
  }

  async maybeSingle() {
    const { data, error } = await this.run();
    if (error) return { data: null, error };
    return { data: (data as Row[])[0] ?? null, error: null };
  }

  async single() {
    const { data, error } = await this.run();
    if (error) return { data: null, error };
    const rows = data as Row[];
    if (rows.length === 0) {
      return { data: null, error: { message: "No rows found", code: "PGRST116" } };
    }
    return { data: rows[0], error: null };
  }

  then<TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }

  private matches(row: Row): boolean {
    return this.filters.every((filter) => {
      const actual = String(row[filter.column]);
      const expected = String(filter.value);
      if (filter.op === "eq") return actual === expected;
      if (filter.op === "neq") return actual !== expected;
      return actual >= expected;
    });
  }

  private async run(): Promise<{ data: unknown; error: unknown }> {
    // A little latency, so loading states are actually observable.
    await new Promise((resolve) => setTimeout(resolve, 30));

    if (this.mode !== "select" && this.failWrites) {
      return { data: null, error: WRITE_FAILURE };
    }

    switch (this.table) {
      case "profiles":
        return this.runProfiles();
      case "categories":
        return this.runCategories();
      case "transactions":
        return this.runTransactions();
      default:
        throw new Error(
          `[tally fixtures] no fixture data for table "${this.table}". ` +
            `Add it to lib/dev/fixtures.ts.`
        );
    }
  }

  private runProfiles(): { data: unknown; error: unknown } {
    const profile = this.store.profile;
    if (this.mode === "update" || this.mode === "upsert") {
      Object.assign(profile, this.payload);
      return { data: null, error: null };
    }
    const rows = this.matches(profile as unknown as Row) ? [profile] : [];
    return { data: rows, error: null };
  }

  private runCategories(): { data: unknown; error: unknown } {
    if (this.mode === "insert") {
      const payload = this.payload as Row;
      const name = String(payload.name);
      const clash = this.store.categories.some(
        (c) => c.user_id === USER_ID && c.name.toLowerCase() === name.toLowerCase()
      );
      if (clash) {
        // Matches the unique (user_id, name) constraint from migration 002.
        return { data: null, error: { message: "duplicate key value", code: "23505" } };
      }
      this.store.categories.push({
        id: `fx-cat-${Date.now()}`,
        user_id: USER_ID,
        name,
        color: String(payload.color),
        icon: String(payload.icon ?? "tag"),
        is_preset: false,
        created_at: new Date().toISOString(),
      });
      return { data: null, error: null };
    }

    if (this.mode === "delete") {
      const before = this.store.categories.length;
      this.store.categories = this.store.categories.filter(
        (c) => !this.matches(c as unknown as Row)
      );
      if (before === this.store.categories.length) {
        return { data: null, error: { message: "No row matched", code: "PGRST116" } };
      }
      // Mirrors ON DELETE SET NULL on transactions.category_id.
      const live = new Set(this.store.categories.map((c) => c.id));
      for (const t of this.store.transactions) {
        if (t.category_id && !live.has(t.category_id)) t.category_id = null;
      }
      return { data: null, error: null };
    }

    const rows = this.store.categories.filter((c) => this.matches(c as unknown as Row));
    return { data: this.sortAndSlice(rows as unknown as Row[]), error: null };
  }

  private runTransactions(): { data: unknown; error: unknown } {
    if (this.mode === "insert") {
      const payload = this.payload as Row;
      this.store.transactions.push({
        id: `fx-tx-${Date.now()}`,
        user_id: USER_ID,
        amount: Number(payload.amount),
        description: (payload.description as string) ?? null,
        merchant: (payload.merchant as string) ?? null,
        category_id: (payload.category_id as string) ?? null,
        date: String(payload.date),
        recurrence: String(payload.recurrence ?? "once"),
        created_at: new Date().toISOString(),
      });
      return { data: null, error: null };
    }

    if (this.mode === "update") {
      const payload = this.payload as Row;
      const touched = this.store.transactions.filter((t) =>
        this.matches(t as unknown as Row)
      );
      for (const row of touched) Object.assign(row, payload);
      // Postgres returns the affected rows when the caller chains .select(),
      // and updateTransaction relies on an empty array to tell "you don't own
      // this row" apart from a successful write.
      return { data: touched.map((t) => ({ ...t })), error: null };
    }

    if (this.mode === "delete") {
      const before = this.store.transactions.length;
      this.store.transactions = this.store.transactions.filter(
        (t) => !this.matches(t as unknown as Row)
      );
      if (before === this.store.transactions.length) {
        return { data: null, error: { message: "No row matched", code: "PGRST116" } };
      }
      return { data: null, error: null };
    }

    // `category:categories(...)` in the select string means the caller wants
    // the joined category object rather than the bare foreign key.
    const wantsCategory = this.columns.includes("categories(");
    const rows = this.store.transactions
      .filter((t) => this.matches(t as unknown as Row))
      .map((t) => {
        const row: Row = { ...t };
        if (wantsCategory) {
          const category = this.store.categories.find((c) => c.id === t.category_id);
          row.category = category
            ? {
                id: category.id,
                name: category.name,
                icon: category.icon,
                color: category.color,
              }
            : null;
        }
        return row;
      });

    return { data: this.sortAndSlice(rows), error: null };
  }

  /** Supabase applies .order() calls in sequence; replicate as a multi-key sort. */
  private sortAndSlice(rows: Row[]): Row[] {
    let out = [...rows];

    if (this.orderings.length > 0) {
      out.sort((a, b) => {
        for (const { column, ascending } of this.orderings) {
          const left = a[column];
          const right = b[column];
          if (left === right) continue;
          const comparison = (left as never) > (right as never) ? 1 : -1;
          return ascending ? comparison : -comparison;
        }
        return 0;
      });
    }

    if (this.rowLimit !== null) out = out.slice(0, this.rowLimit);
    return out;
  }
}

// ---------------------------------------------------------------- the client

export interface FixtureClientOptions {
  /** Raw `tally_fx` cookie value — `<scenario>` or `<scenario>:<nonce>`. */
  scenario: string;
}

export function createFixtureClient({ scenario }: FixtureClientOptions) {
  const base = baseScenario(scenario);
  const store = getStore(scenario, base);
  const failWrites = base === "error";
  const signedOut = base === "signedout";

  if (!globalForFixtures.__tallyFixtureWarned) {
    globalForFixtures.__tallyFixtureWarned = true;
    console.warn(
      `\n  ⚠  ${FIXTURE_BUILD_SENTINEL}\n` +
        `     Supabase is stubbed with seeded data from lib/dev/fixtures.ts.\n` +
        `     Nothing is read from or written to a real database.\n` +
        `     Unset TALLY_DEV_FIXTURES in .env.local to use real data.\n`
    );
  }

  const auth = guardUnsupported(
    {
      async getUser() {
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

  return guardUnsupported(
    {
      auth,
      from(table: string) {
        return guardUnsupported(
          new QueryBuilder(table, store, failWrites),
          `from("${table}")`
        );
      },
    },
    "supabase"
  );
}
