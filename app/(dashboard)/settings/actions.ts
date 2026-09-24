"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateProfileInput } from "@/lib/utils/profile";
import { validateIncomeInput, type IncomeInput } from "@/lib/utils/income";

export interface UpdateProfileResult {
  error?: string;
  success?: boolean;
}

export interface CreateCategoryResult {
  error?: string;
  success?: boolean;
}

export interface DeleteCategoryResult {
  error?: string;
}

export async function updateProfile(
  savingsBalance: number
): Promise<UpdateProfileResult> {
  const validationError = validateProfileInput(savingsBalance);
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
    .update({ savings_balance: savingsBalance })
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

/**
 * Delete one of the user's own custom categories.
 *
 * Presets are protected by RLS (the delete policy requires is_preset = false
 * and a matching user_id), and transactions.category_id is ON DELETE SET NULL,
 * so existing expenses survive the delete and fall back to "Uncategorized"
 * rather than disappearing with the category.
 */
export async function deleteCategory(
  id: string
): Promise<DeleteCategoryResult> {
  if (!id) {
    return { error: "Missing category id." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You're not signed in." };
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_preset", false);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/transactions/new");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return {};
}

export interface IncomeSourceResult {
  error?: string;
  success?: boolean;
}

export async function createIncomeSource(
  input: IncomeInput
): Promise<IncomeSourceResult> {
  const validated = validateIncomeInput(input);
  if (!validated.ok) {
    return { error: validated.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You're not signed in." };
  }

  const { error } = await supabase
    .from("income_sources")
    .insert({ user_id: user.id, ...validated.fields });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { success: true };
}

export async function deleteIncomeSource(
  id: string
): Promise<IncomeSourceResult> {
  if (!id) {
    return { error: "Missing income source id." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You're not signed in." };
  }

  // RLS is the real boundary; the explicit user_id filter states the intent.
  const { error } = await supabase
    .from("income_sources")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { success: true };
}
