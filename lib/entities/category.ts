/** Writing the user's own categories: create and delete. */

import { validateCategoryInput } from "@/lib/utils/category-input";
import { MAX_CATEGORIES, rowLimitMessage } from "@/lib/utils/limits";
import { fail, failStore, ok, PAGES, type Store, type WriteResult } from "./write";

const MESSAGES = {
  duplicate: "You already have a category with that name.",
  rowLimit: rowLimitMessage(MAX_CATEGORIES, "custom categories"),
};

export async function createCategory(
  store: Store,
  userId: string,
  name: string,
  color: string
): Promise<WriteResult> {
  const validated = validateCategoryInput(name, color);
  if (!validated.ok) return fail(validated.error);

  const added = await store.categories.add(userId, validated.fields);
  if (!added.ok) return failStore("createCategory", added.error, MESSAGES);

  // Categories are listed in Settings and in both expense forms, and shown on
  // every expense, so the dashboard's breakdowns follow.
  return ok(PAGES.settings, PAGES.newTransaction, PAGES.editTransaction, PAGES.dashboard);
}

/**
 * Delete one of the user's own custom categories.
 *
 * Presets can't be deleted (the store only removes custom ones), and the
 * expenses in a deleted category survive and fall back to "Uncategorized"
 * rather than disappearing with it.
 */
export async function deleteCategory(
  store: Store,
  userId: string,
  id: string
): Promise<WriteResult> {
  if (!id) return fail("Missing category id.");

  const removed = await store.categories.remove(userId, id);
  if (!removed.ok) return failStore("deleteCategory", removed.error);

  // The expenses that fell back to "Uncategorized" are on the list too.
  return ok(
    PAGES.settings,
    PAGES.newTransaction,
    PAGES.editTransaction,
    PAGES.dashboard,
    PAGES.transactions
  );
}
