"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateProfileInput } from "@/lib/utils/profile";

export interface UpdateProfileResult {
  error?: string;
  success?: boolean;
}

export interface CreateCategoryResult {
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

export async function createCategory(
  name: string,
  color: string
): Promise<CreateCategoryResult> {
  const trimmedName = name.trim();

  if (trimmedName.length < 2) {
    return { error: "Category name must be at least 2 characters." };
  }

  if (trimmedName.length > 32) {
    return { error: "Category name must be 32 characters or fewer." };
  }

  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return { error: "Choose a valid category color." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You're not signed in." };
  }

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name: trimmedName,
    color,
    icon: "tag",
    is_preset: false,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "You already have a category with that name." };
    }
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/transactions/new");
  revalidatePath("/dashboard");
  return { success: true };
}
