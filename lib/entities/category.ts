/** Writing the user's own categories: create and delete. */

import { validateCategoryInput } from "@/lib/utils/category-input";
import { MAX_CATEGORIES, rowLimitMessage } from "@/lib/utils/limits";
import { fail, failDb, ok, PAGES, type Client, type WriteResult } from "./write";

const MESSAGES = {
  duplicate: "You already have a category with that name.",
  rowLimit: rowLimitMessage(MAX_CATEGORIES, "custom categories"),
};

export async function createCategory(
  client: Client,
  userId: string,
  name: string,
  color: string
): Promise<WriteResult> {
  const validated = validateCategoryInput(name, color);
  if (!validated.ok) return fail(validated.error);

  const { error } = await client.from("categories").insert({
    user_id: userId,
    ...validated.fields,
    icon: "tag",
    is_preset: false,
  });
  if (error) return failDb("createCategory", error, MESSAGES);

  // Categories are listed in Settings and in both expense forms, and shown on
  // every expense, so the dashboard's breakdowns follow.
  return ok(PAGES.settings, PAGES.newTransaction, PAGES.editTransaction, PAGES.dashboard);
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
  client: Client,
  userId: string,
  id: string
): Promise<WriteResult> {
  if (!id) return fail("Missing category id.");

  const { error } = await client
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .eq("is_preset", false);
  if (error) return failDb("deleteCategory", error);

  // The expenses that fell back to "Uncategorized" are on the list too.
  return ok(
    PAGES.settings,
    PAGES.newTransaction,
    PAGES.editTransaction,
    PAGES.dashboard,
    PAGES.transactions
  );
}
