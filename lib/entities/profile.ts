/**
 * Writing the user's profile: the savings balance, and finishing onboarding.
 */

import { validateIncomeInput } from "@/lib/utils/income";
import { validateProfileInput } from "@/lib/utils/profile";
import { roundToCents } from "@/lib/utils/limits";
import { fail, failStore, ok, PAGES, type Store, type WriteResult } from "./write";

export async function updateSavings(
  store: Store,
  userId: string,
  savingsBalance: number
): Promise<WriteResult> {
  const validationError = validateProfileInput(savingsBalance);
  if (validationError) return fail(validationError);

  // Only the balance: the user has clearly already gone through onboarding
  // to reach Settings, so `onboarded` stays as it is.
  const saved = await store.profiles.setSavings(userId, roundToCents(savingsBalance));
  if (!saved.ok) return failStore("updateProfile", saved.error);

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
  store: Store,
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

  const savings = roundToCents(savingsBalance);

  // Onboarding happens once. The page already sends an onboarded user to the
  // dashboard, but the action can be called directly, and a replay would add
  // another "Salary" income source each time.
  //
  // Reading `onboarded` and then writing it left a gap two parallel calls
  // could both get through, so the store flips it as one conditional update
  // and says whether this call was the one that did.
  const flipped = await store.profiles.markOnboarded(userId, savings);
  if (!flipped.ok) return failStore("completeOnboarding", flipped.error);

  if (!flipped.value) {
    // Either someone got there first, or the sign-up trigger never made a
    // profile row. Creating one settles both: a missing row is made, and an
    // existing one is a duplicate, which means already onboarded.
    const created = await store.profiles.createOnboarded(userId, savings);
    if (!created.ok) {
      if (created.error.kind === "duplicate") return ok();
      return failStore("completeOnboarding", created.error);
    }
  }

  // It can be edited or deleted in Settings like any other income source.
  if (salary) {
    const added = await store.incomeSources.add(userId, salary.fields);
    if (!added.ok) return failStore("completeOnboarding", added.error);
  }

  return ok(PAGES.dashboard, PAGES.settings);
}
