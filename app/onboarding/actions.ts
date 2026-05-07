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
  const validationError = validateProfileInput(savingsBalance, monthlySalary);
  if (validationError) {
    return { error: validationError };
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
      monthly_salary: monthlySalary,
      onboarded: true,
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
