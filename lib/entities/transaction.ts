/**
 * Writing expenses: create, edit, delete.
 *
 * Owns the order every one of them follows (validate, check the category is
 * one the user may use, write, map what the store says) and what each change
 * makes stale. The actions in app/(dashboard)/transactions are adapters over
 * this.
 */

import { latestDayOnEarth } from "@/lib/utils/calendar";
import { MAX_TRANSACTIONS, rowLimitMessage } from "@/lib/utils/limits";
import {
  validateTransactionInput,
  type TransactionInput,
} from "@/lib/utils/transaction-input";
import { canUseCategory, CATEGORY_UNAVAILABLE_MESSAGE } from "./category-access";
import { fail, failStore, ok, PAGES, type Store, type WriteResult } from "./write";

// The form defaults to the browser's today, which can be a day ahead of the
// server's. A date is only "in the future" once no time zone has reached it.
function validate(input: TransactionInput) {
  return validateTransactionInput(input, latestDayOnEarth());
}

const MESSAGES = {
  rowLimit: rowLimitMessage(MAX_TRANSACTIONS, "expenses"),
};

export async function createTransaction(
  store: Store,
  userId: string,
  input: TransactionInput
): Promise<WriteResult> {
  const validated = validate(input);
  if (!validated.ok) return fail(validated.error);

  if (!(await canUseCategory(store, userId, validated.fields.category_id))) {
    return fail(CATEGORY_UNAVAILABLE_MESSAGE);
  }

  const added = await store.transactions.add(userId, validated.fields);
  if (!added.ok) return failStore("createTransaction", added.error, MESSAGES);

  return ok(PAGES.dashboard, PAGES.transactions);
}

export async function updateTransaction(
  store: Store,
  userId: string,
  id: string,
  input: TransactionInput
): Promise<WriteResult> {
  if (!id) return fail("Missing transaction id.");

  const validated = validate(input);
  if (!validated.ok) return fail(validated.error);

  if (!(await canUseCategory(store, userId, validated.fields.category_id))) {
    return fail(CATEGORY_UNAVAILABLE_MESSAGE);
  }

  // The store says whether anything matched, so a wrong id can't report
  // success against zero rows.
  const updated = await store.transactions.update(userId, id, validated.fields);
  if (!updated.ok) return failStore("updateTransaction", updated.error, MESSAGES);
  if (!updated.value) return fail("That expense no longer exists.");

  return ok(PAGES.dashboard, PAGES.transactions, PAGES.editTransaction);
}

export async function deleteTransaction(
  store: Store,
  userId: string,
  id: string
): Promise<WriteResult> {
  if (!id) return fail("Missing transaction id.");

  const removed = await store.transactions.remove(userId, id);
  if (!removed.ok) return failStore("deleteTransaction", removed.error);

  return ok(PAGES.dashboard, PAGES.transactions, PAGES.editTransaction);
}
