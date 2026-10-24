/**
 * The user's financial picture: everything the dashboard shows, loaded and
 * worked out in one place.
 *
 * The dashboard used to run six queries, cast each result into shape, and
 * feed seven utilities in the right order, all inside the page. This module
 * has a small interface (`loadFinancialPicture`) over that whole job, so the
 * page is layout and the rules live where they can be tested.
 *
 * Two things it owns that the page used to get wrong or leave implicit:
 *
 *  - One "now". It is read once per load and every window below is cut from
 *    it, so the read bound, the in-memory filters and the utilities can't
 *    disagree about when "the last 30 days" starts.
 *  - Failed reads. A read that fails used to resolve with `{ error }` and be
 *    treated as "no rows", which turned a failed income read into income of 0
 *    and a false runway. Any failed read is `unavailable`, and a failed
 *    profile read is not `needs-onboarding`.
 *
 * It reads through the Store interface, which is passed in: the Supabase
 * adapter in production, the in-memory one in tests and dev fixtures.
 */

import type { Store, TransactionRecord } from "@/lib/store/types";
import type { RunwayInfo } from "@/types";
import {
  groupByCategory,
  groupByMerchant,
  comparePeriods,
  type PeriodComparison,
  type Slice,
} from "@/lib/utils/aggregation";
import { daysAgo } from "@/lib/utils/calendar";
import { commitmentBreakdown, type CommitmentSummary } from "@/lib/utils/commitments";
import { incomeByMonth, monthlyIncome } from "@/lib/utils/income";
import {
  projectionScale,
  projectSavings,
  type ProjectionScale,
} from "@/lib/utils/projection";
import { calculateRunway } from "@/lib/utils/runway";
import { monthlyBurnRate, spendingSummary } from "@/lib/utils/spending";

/** How far back the breakdowns and the burn rate look. */
const SPENDING_WINDOW_DAYS = 30;
/** Twice the window, so the period comparison has a prior period to read. */
const COMPARISON_WINDOW_DAYS = 60;
const RECENT_COUNT = 5;
const PROJECTION_MONTHS = 12;

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
  recent: TransactionRecord[];
}

export type FinancialPictureResult =
  | { status: "ready"; picture: FinancialPicture }
  /** No profile yet, or one that hasn't finished onboarding. */
  | { status: "needs-onboarding" }
  /** A read failed. Nothing here can be trusted, so nothing is returned. */
  | { status: "unavailable" };

export async function loadFinancialPicture(
  store: Store,
  userId: string,
  now: Date = new Date()
): Promise<FinancialPictureResult> {
  const profile = await store.profiles.get(userId);
  if (!profile.ok) {
    // Not `needs-onboarding`: an onboarded user whose profile read fails
    // would be bounced into a flow that rejects them.
    console.error("loadFinancialPicture failed:", profile.error);
    return { status: "unavailable" };
  }
  if (!profile.value?.onboarded) {
    return { status: "needs-onboarding" };
  }

  const [income, recurring, window, recent] = await Promise.all([
    // Every source, not just the ones paying right now — a raise that starts
    // in three months still belongs in the projection.
    store.incomeSources.list(),
    // Standing commitments count every month regardless of when they were
    // last logged, so they can't be limited to the window — a yearly bill
    // logged eight months ago is still owed.
    store.transactions.listRecurring(),
    // One read covers every window: the 30-day figures are a subset of it.
    store.transactions.listSince(daysAgo(now, COMPARISON_WINDOW_DAYS)),
    store.transactions.listRecent(RECENT_COUNT),
  ]);

  if (!income.ok || !recurring.ok || !window.ok || !recent.ok) {
    const failed = [income, recurring, window, recent].find((r) => !r.ok);
    console.error("loadFinancialPicture failed:", failed && !failed.ok && failed.error);
    return { status: "unavailable" };
  }

  const savings = profile.value.savings_balance;
  const incomeSources = income.value;
  const recurringRows = recurring.value;
  const windowRows = window.value;

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
      recent: recent.value,
    },
  };
}
