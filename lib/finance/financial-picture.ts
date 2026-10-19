/**
 * The user's financial picture: everything the dashboard shows, loaded and
 * worked out in one place.
 *
 * The dashboard used to run six queries, cast each result into shape, and
 * feed seven utilities in the right order, all inside the page. This module
 * has a small interface (`loadFinancialPicture`) over that whole job, so the
 * page is layout and the rules live where they can be tested.
 *
 * Three things it owns that the page used to get wrong or leave implicit:
 *
 *  - One "now". It is read once per load and every window below is cut from
 *    it, so the query bounds, the in-memory filters and the utilities can't
 *    disagree about when "the last 30 days" starts.
 *  - Failed reads. A Supabase read that fails resolves with `{ error }`
 *    instead of throwing, and treating that as "no rows" turned a failed
 *    income read into income of 0 and a false runway. Any failed read is
 *    `unavailable`, and a failed profile read is not `needs-onboarding`.
 *  - Row shapes. The client isn't typed against the schema, so rows are
 *    narrowed here, once, instead of cast at each call site.
 *
 * The client is passed in rather than created here. Tests hand it the
 * fixture client directly, and it is the seam a store interface can replace
 * without touching the page or the maths.
 */

import type { createClient } from "@/lib/supabase/server";
import type { RunwayInfo } from "@/types";
import {
  groupByCategory,
  groupByMerchant,
  comparePeriods,
  type PeriodComparison,
  type Slice,
} from "@/lib/utils/aggregation";
import { commitmentBreakdown, type CommitmentSummary } from "@/lib/utils/commitments";
import {
  incomeByMonth,
  monthlyIncome,
  type IncomeSource,
} from "@/lib/utils/income";
import {
  projectionScale,
  projectSavings,
  type ProjectionScale,
} from "@/lib/utils/projection";
import { daysAgo } from "@/lib/utils/calendar";
import { calculateRunway } from "@/lib/utils/runway";
import { monthlyBurnRate, spendingSummary } from "@/lib/utils/spending";

type Client = Awaited<ReturnType<typeof createClient>>;

/** How far back the breakdowns and the burn rate look. */
const SPENDING_WINDOW_DAYS = 30;
/** Twice the window, so the period comparison has a prior period to read. */
const COMPARISON_WINDOW_DAYS = 60;
const RECENT_COUNT = 5;
const PROJECTION_MONTHS = 12;

export interface CategoryRef {
  id: string;
  name: string;
  icon: string;
  color: string;
}

/** A transaction as the dashboard's row list shows it. */
export interface RecentTransaction {
  id: string;
  amount: number;
  description: string | null;
  merchant: string | null;
  date: string;
  recurrence: string | null;
  category: CategoryRef | null;
}

export interface FinancialPicture {
  savings: number;
  /** This month's income, summed across the sources paying out in it. */
  monthlyIncome: number;
  /** One entry per month, this one first, for the projection to walk. */
  incomeSchedule: number[];
  /**
   * What the user is committed to spending per month. See monthlyBurnRate
   * for why this isn't simply the last 30 days' total.
   */
  burnRate: number;
  /**
   * False when there's nothing to base a burn rate on. The runway and the
   * projection then say "needs data" rather than "infinite runway".
   */
  hasSpendingData: boolean;
  runway: RunwayInfo;
  /** Picked from the real projection and held while the explorer's slider moves. */
  projectionScale: ProjectionScale;
  spending: { today: number; this_week: number; this_month: number };
  commitments: CommitmentSummary;
  categorySlices: Slice[];
  merchantSlices: Slice[];
  periodComparison: PeriodComparison;
  recent: RecentTransaction[];
}

export type FinancialPictureResult =
  | { status: "ready"; picture: FinancialPicture }
  /** No profile yet, or one that hasn't finished onboarding. */
  | { status: "needs-onboarding" }
  /** A read failed. Nothing here can be trusted, so nothing is returned. */
  | { status: "unavailable" };

export async function loadFinancialPicture(
  client: Client,
  userId: string,
  now: Date = new Date()
): Promise<FinancialPictureResult> {
  // Row-level security scopes the reads below to the signed-in user, so only
  // the profile, which is keyed by user id, names one.
  const profile = await client
    .from("profiles")
    .select("savings_balance, onboarded")
    .eq("id", userId)
    .maybeSingle();
  if (profile.error) {
    // Not `needs-onboarding`: an onboarded user whose profile read fails
    // would be bounced into a flow that rejects them.
    console.error("loadFinancialPicture failed:", profile.error);
    return { status: "unavailable" };
  }
  if (!profile.data?.onboarded) {
    return { status: "needs-onboarding" };
  }

  const comparisonStart = daysAgo(now, COMPARISON_WINDOW_DAYS);

  const [income, recurring, window, recentRows] = await Promise.all([
    // Every source, not just the ones paying right now — a raise that starts
    // in three months still belongs in the projection.
    client
      .from("income_sources")
      .select("id, name, amount, recurrence, starts_on, ends_on")
      .order("created_at", { ascending: true }),
    // Standing commitments count every month regardless of when they were
    // last logged, so they can't be limited to the window — a yearly bill
    // logged eight months ago is still owed.
    client
      .from("transactions")
      .select(
        "amount, date, merchant, description, recurrence, category:categories(id, name, icon, color)"
      )
      .neq("recurrence", "once")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    // One read covers every window: the 30-day figures are a subset of it.
    client
      .from("transactions")
      .select(
        "amount, date, merchant, recurrence, category:categories(id, name, icon, color)"
      )
      .gte("date", comparisonStart),
    client
      .from("transactions")
      .select(
        "id, amount, description, merchant, date, recurrence, category:categories(id, name, icon, color)"
      )
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(RECENT_COUNT),
  ]);

  const failed = [income, recurring, window, recentRows].find((r) => r.error);
  if (failed) {
    console.error("loadFinancialPicture failed:", failed.error);
    return { status: "unavailable" };
  }

  const savings = Number(profile.data.savings_balance);
  const incomeSources = rows(income.data).map(toIncomeSource);
  const recurringRows = rows(recurring.data).map(toTransaction);
  const windowRows = rows(window.data).map(toTransaction);

  const spendingStart = daysAgo(now, SPENDING_WINDOW_DAYS);
  const last30 = windowRows.filter((t) => t.date >= spendingStart);

  const monthly = monthlyIncome(incomeSources, now);
  const incomeSchedule = incomeByMonth(incomeSources, PROJECTION_MONTHS, now);
  const burnRate = monthlyBurnRate(last30, recurringRows, now);
  const projection = projectSavings(savings, incomeSchedule, burnRate);

  return {
    status: "ready",
    picture: {
      savings,
      monthlyIncome: monthly,
      incomeSchedule,
      burnRate,
      hasSpendingData: last30.length > 0 || recurringRows.length > 0,
      runway: calculateRunway(savings, monthly, burnRate),
      projectionScale: projectionScale(projection.depletionMonth),
      spending: spendingSummary(last30, now),
      commitments: commitmentBreakdown(recurringRows, monthly),
      categorySlices: groupByCategory(last30),
      merchantSlices: groupByMerchant(last30),
      periodComparison: comparePeriods(windowRows, now),
      recent: rows(recentRows.data).map(toRecent),
    },
  };
}

// ------------------------------------------------------------- row narrowing

type Row = Record<string, unknown>;

function rows(data: unknown): Row[] {
  return Array.isArray(data) ? (data as Row[]) : [];
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * A joined `category` is one row through a single foreign key, but PostgREST's
 * typings describe it as an array and some responses really do wrap it. Take
 * the first either way.
 */
function toCategory(value: unknown): CategoryRef | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "object" || raw === null) return null;
  const c = raw as Row;
  if (typeof c.id !== "string") return null;
  return {
    id: c.id,
    name: text(c.name) ?? "",
    icon: text(c.icon) ?? "tag",
    color: text(c.color) ?? "#9CA3AF",
  };
}

function toTransaction(row: Row) {
  return {
    amount: Number(row.amount),
    date: String(row.date),
    merchant: text(row.merchant),
    description: text(row.description),
    recurrence: text(row.recurrence),
    category: toCategory(row.category),
  };
}

function toRecent(row: Row): RecentTransaction {
  return { id: String(row.id), ...toTransaction(row) };
}

function toIncomeSource(row: Row): IncomeSource {
  return {
    id: String(row.id),
    name: String(row.name),
    amount: Number(row.amount),
    recurrence: String(row.recurrence),
    starts_on: text(row.starts_on),
    ends_on: text(row.ends_on),
  };
}
