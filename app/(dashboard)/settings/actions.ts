"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateProfileInput } from "@/lib/utils/profile";

export interface UpdateProfileResult {
  error?: string;
  success?: boolean;
}

export async function updateProfile(
  savingsBalance: number,
  monthlySalary: number
): Promise<UpdateProfileResult> {
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

  // Update only the financial fields. Don't touch `onboarded` since the
  // user has clearly already gone through onboarding to reach Settings.
  const { error } = await supabase
    .from("profiles")
    .update({
      savings_balance: savingsBalance,
      monthly_salary: monthlySalary,
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { success: true };
}
