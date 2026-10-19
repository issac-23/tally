/**
 * Writing expenses: create, edit, delete.
 *
 * Owns the order every one of them follows (validate, check the category is
 * one the user may use, write, map what the database says) and what each
 * change makes stale. The actions in app/(dashboard)/transactions are adapters
 * over this.
 */

import {
  canUseCategory,
  CATEGORY_UNAVAILABLE_MESSAGE,
} from "@/lib/supabase/categories";
import { MAX_TRANSACTIONS, rowLimitMessage } from "@/lib/utils/limits";
import {
  validateTransactionInput,
  type TransactionInput,
} from "@/lib/utils/transaction-input";
import { fail, failDb, ok, PAGES, type Client, type WriteResult } from "./write";

const MESSAGES = {
  rowLimit: rowLimitMessage(MAX_TRANSACTIONS, "expenses"),
};

export async function createTransaction(
  client: Client,
  userId: string,
  input: TransactionInput
): Promise<WriteResult> {
  const validated = validateTransactionInput(input);
  if (!validated.ok) return fail(validated.error);

  if (!(await canUseCategory(client, userId, validated.fields.category_id))) {
    return fail(CATEGORY_UNAVAILABLE_MESSAGE);
  }

  const { error } = await client
    .from("transactions")
    .insert({ user_id: userId, ...validated.fields });
  if (error) return failDb("createTransaction", error, MESSAGES);

  return ok(PAGES.dashboard, PAGES.transactions);
}

export async function updateTransaction(
  client: Client,
  userId: string,
  id: string,
  input: TransactionInput
): Promise<WriteResult> {
  if (!id) return fail("Missing transaction id.");

  const validated = validateTransactionInput(input);
  if (!validated.ok) return fail(validated.error);

  if (!(await canUseCategory(client, userId, validated.fields.category_id))) {
    return fail(CATEGORY_UNAVAILABLE_MESSAGE);
  }

  // RLS is the real boundary; the explicit user_id filter states the intent.
  // Without it a wrong id would report success against zero rows.
  const { data, error } = await client
    .from("transactions")
    .update(validated.fields)
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");
  if (error) return failDb("updateTransaction", error, MESSAGES);
  if (!data || data.length === 0) return fail("That expense no longer exists.");

  return ok(PAGES.dashboard, PAGES.transactions, PAGES.editTransaction);
}

export async function deleteTransaction(
  client: Client,
  userId: string,
  id: string
): Promise<WriteResult> {
  if (!id) return fail("Missing transaction id.");

  const { error } = await client
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) return failDb("deleteTransaction", error);

  return ok(PAGES.dashboard, PAGES.transactions, PAGES.editTransaction);
}
