"use server";

import { runWrite } from "@/lib/entities/run-write";
import * as categories from "@/lib/entities/category";
import * as incomeSources from "@/lib/entities/income-source";
import * as profile from "@/lib/entities/profile";
import type { IncomeInput } from "@/lib/utils/income";

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

export interface IncomeSourceResult {
  error?: string;
  success?: boolean;
}

// Thin adapters: lib/entities owns validation, the write, the error messages
// and which pages to refresh. These only name the action and shape the answer
// for the forms that call it.

export async function updateProfile(
  savingsBalance: number
): Promise<UpdateProfileResult> {
  const result = await runWrite((client, userId) =>
    profile.updateSavings(client, userId, savingsBalance)
  );
  return result.ok ? { success: true } : { error: result.error };
}

export async function createCategory(
  name: string,
  color: string
): Promise<CreateCategoryResult> {
  const result = await runWrite((client, userId) =>
    categories.createCategory(client, userId, name, color)
  );
  return result.ok ? { success: true } : { error: result.error };
}

export async function deleteCategory(
  id: string
): Promise<DeleteCategoryResult> {
  const result = await runWrite((client, userId) =>
    categories.deleteCategory(client, userId, id)
  );
  return result.ok ? {} : { error: result.error };
}

export async function createIncomeSource(
  input: IncomeInput
): Promise<IncomeSourceResult> {
  const result = await runWrite((client, userId) =>
    incomeSources.createIncomeSource(client, userId, input)
  );
  return result.ok ? { success: true } : { error: result.error };
}

export async function deleteIncomeSource(
  id: string
): Promise<IncomeSourceResult> {
  const result = await runWrite((client, userId) =>
    incomeSources.deleteIncomeSource(client, userId, id)
  );
  return result.ok ? { success: true } : { error: result.error };
}
