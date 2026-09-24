"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateProfileInput } from "@/lib/utils/profile";

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You're not signed in." };
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
    return { error: error.message };
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
      return { error: incomeError.message };
    }
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
