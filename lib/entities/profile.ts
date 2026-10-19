/**
 * Writing the user's profile: the savings balance, and finishing onboarding.
 */

import { validateIncomeInput } from "@/lib/utils/income";
import { validateProfileInput } from "@/lib/utils/profile";
import { roundToCents } from "@/lib/utils/limits";
import { fail, failDb, ok, PAGES, type Client, type WriteResult } from "./write";

export async function updateSavings(
  client: Client,
  userId: string,
  savingsBalance: number
): Promise<WriteResult> {
  const validationError = validateProfileInput(savingsBalance);
  if (validationError) return fail(validationError);

  // Update only the financial fields. Don't touch `onboarded` since the
  // user has clearly already gone through onboarding to reach Settings.
  const { error } = await client
    .from("profiles")
    .update({ savings_balance: roundToCents(savingsBalance) })
    .eq("id", userId);
  if (error) return failDb("updateProfile", error);

  return ok(PAGES.dashboard, PAGES.settings);
}

/**
 * Finish onboarding: set the savings balance, flip `onboarded`, and turn the
 * one income question into an ordinary income source.
 *
 * Succeeds with nothing to refresh when the user was already onboarded, so
 * the caller can send a replay to the dashboard like a first run.
 */
export async function completeOnboarding(
  client: Client,
  userId: string,
  savingsBalance: number,
  monthlySalary: number
): Promise<WriteResult> {
  const validationError = validateProfileInput(savingsBalance);
  if (validationError) return fail(validationError);

  // Onboarding still asks one question about income, because asking someone
  // to model three sources before they've seen the app is too much. Nothing
  // earned means nothing to add; anything else becomes an ordinary income
  // source, so it has to pass the same rules as one.
  const salary =
    roundToCents(monthlySalary) === 0
      ? null
      : validateIncomeInput({ name: "Salary", amount: monthlySalary, recurrence: "monthly" });
  if (salary && !salary.ok) return fail(salary.error);

  // Onboarding happens once. The page already sends an onboarded user to the
  // dashboard, but the action can be called directly, and a replay would add
  // another "Salary" income source each time.
  //
  // Reading `onboarded` and then writing it left a gap two parallel calls
  // could both get through. Flipping it with a conditional update closes
  // that: Postgres re-checks the WHERE after waiting on the row lock, so
  // only one call sees onboarded = false and gets a row back.
  const { data: flipped, error } = await client
    .from("profiles")
    .update({ savings_balance: roundToCents(savingsBalance), onboarded: true })
    .eq("id", userId)
    .eq("onboarded", false)
    .select("id");
  if (error) return failDb("completeOnboarding", error);

  if (!flipped || flipped.length === 0) {
    // Either someone got there first, or the sign-up trigger never made a
    // profile row. Insert settles both: a missing row is created, and an
    // existing one is a primary key conflict, which means already onboarded.
    const { error: insertError } = await client.from("profiles").insert({
      id: userId,
      savings_balance: roundToCents(savingsBalance),
      onboarded: true,
    });

    if (insertError) {
      if (insertError.code === "23505") return ok();
      return failDb("completeOnboarding", insertError);
    }
  }

  // It can be edited or deleted in Settings like any other.
  if (salary) {
    const { error: incomeError } = await client
      .from("income_sources")
      .insert({ user_id: userId, ...salary.fields });
    if (incomeError) return failDb("completeOnboarding", incomeError);
  }

  return ok(PAGES.dashboard, PAGES.settings);
}
