"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAndFail } from "@/lib/utils/errors";
import { validateProfileInput } from "@/lib/utils/profile";
import { MAX_AMOUNT, MAX_AMOUNT_MESSAGE, roundToCents } from "@/lib/utils/limits";

export interface OnboardingResult {
  error?: string;
}

export async function completeOnboarding(
  savingsBalance: number,
  monthlySalary: number
): Promise<OnboardingResult> {
  const validationError = validateProfileInput(savingsBalance);
  if (validationError) {
    return { error: validationError };
  }
  if (!Number.isFinite(monthlySalary) || monthlySalary < 0) {
    return { error: "Please enter valid numbers." };
  }
  const salary = roundToCents(monthlySalary);
  if (salary > MAX_AMOUNT) {
    return { error: MAX_AMOUNT_MESSAGE };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You're not signed in." };
  }

  // Onboarding happens once. The page already sends an onboarded user to the
  // dashboard, but the action can be called directly, and a replay would add
  // another "Salary" income source each time.
  //
  // Reading `onboarded` and then writing it left a gap two parallel calls
  // could both get through. Flipping it with a conditional update closes
  // that: Postgres re-checks the WHERE after waiting on the row lock, so
  // only one call sees onboarded = false and gets a row back.
  const { data: flipped, error } = await supabase
    .from("profiles")
    .update({ savings_balance: roundToCents(savingsBalance), onboarded: true })
    .eq("id", user.id)
    .eq("onboarded", false)
    .select("id");

  if (error) {
    return logAndFail("completeOnboarding", error);
  }

  if (!flipped || flipped.length === 0) {
    // Either someone got there first, or the sign-up trigger never made a
    // profile row. Insert settles both: a missing row is created, and an
    // existing one is a primary key conflict, which means already onboarded.
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      savings_balance: roundToCents(savingsBalance),
      onboarded: true,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        redirect("/dashboard");
      }
      return logAndFail("completeOnboarding", insertError);
    }
  }

  // Onboarding still asks one question about income, because asking someone
  // to model three sources before they've seen the app is too much. It
  // becomes an ordinary income source they can edit or delete in Settings.
  if (salary > 0) {
    const { error: incomeError } = await supabase.from("income_sources").insert({
      user_id: user.id,
      name: "Salary",
      amount: salary,
      recurrence: "monthly",
    });

    if (incomeError) {
      return logAndFail("completeOnboarding", incomeError);
    }
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
