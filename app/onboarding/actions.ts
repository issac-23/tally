"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { GENERIC_ERROR } from "@/lib/utils/errors";
import { validateProfileInput } from "@/lib/utils/profile";
import { MAX_AMOUNT, MAX_AMOUNT_MESSAGE } from "@/lib/utils/limits";

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
  if (monthlySalary > MAX_AMOUNT) {
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
  const { data: existing, error: profileError } = await supabase
    .from("profiles")
    .select("onboarded")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("completeOnboarding failed:", profileError);
    return { error: GENERIC_ERROR };
  }
  if (existing?.onboarded) {
    redirect("/dashboard");
  }

  // Upsert: handles both fresh signups (auto-created blank profile)
  // and any edge case where the row didn't exist yet.
  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      savings_balance: savingsBalance,
      onboarded: true,
    });

  if (error) {
    console.error("completeOnboarding failed:", error);
    return { error: GENERIC_ERROR };
  }

  // Onboarding still asks one question about income, because asking someone
  // to model three sources before they've seen the app is too much. It
  // becomes an ordinary income source they can edit or delete in Settings.
  if (monthlySalary > 0) {
    const { error: incomeError } = await supabase.from("income_sources").insert({
      user_id: user.id,
      name: "Salary",
      amount: monthlySalary,
      recurrence: "monthly",
    });

    if (incomeError) {
      console.error("completeOnboarding failed:", incomeError);
      return { error: GENERIC_ERROR };
    }
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
