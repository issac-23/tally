/**
 * Writing expenses: create, edit, delete.
 *
 * Owns the order every one of them follows (validate, check the category is
 * one the user may use, write, map what the store says) and what each change
 * makes stale. The actions in app/(dashboard)/transactions are adapters over
 * this.
 */

import { latestDayOnEarth } from "@/lib/utils/calendar";
import { recurringSeries, seriesKey } from "@/lib/utils/recurrence";
import { MAX_TRANSACTIONS, rowLimitMessage } from "@/lib/utils/limits";
import {
  validateTransactionInput,
  type TransactionInput,
} from "@/lib/utils/transaction-input";
import { stored, type TransactionRecord } from "@/lib/store/types";
import type { TransactionFields } from "@/lib/utils/transaction-input";
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

  const before = await store.transactions.get(userId, id);
  if (!before.ok) return failStore("updateTransaction", before.error, MESSAGES);

  // The store says whether anything matched, so a wrong id can't report
  // success against zero rows.
  const updated = await store.transactions.update(userId, id, validated.fields);
  if (!updated.ok) return failStore("updateTransaction", updated.error, MESSAGES);
  if (!updated.value) return fail("That expense no longer exists.");

  if (before.value) {
    const kept = await keepSeriesTogether(store, userId, before.value, validated.fields);
    if (!kept.ok) return failStore("updateTransaction", kept.error, MESSAGES);
  }

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

/**
 * Carry a change to what identifies a commitment back through its history.
 *
 * A series is keyed on recurrence, category and merchant, so retyping the
 * merchant on the newest row would otherwise leave the older rows behind as
 * a second series that keeps counting. When the row being edited is the one
 * that stands for its series, the earlier rows follow it. Editing an older
 * row moves just that row, since that is what was asked for.
 */
async function keepSeriesTogether(
  store: Store,
  userId: string,
  before: TransactionRecord,
  after: TransactionFields
) {
  const unchanged = stored(undefined);
  if (before.recurrence === "once") return unchanged;

  const afterKey = seriesKey({
    recurrence: after.recurrence,
    category_id: after.category_id,
    merchant: after.merchant,
  });
  if (seriesKey(before) === afterKey) return unchanged;

  const recurring = await store.transactions.listRecurring();
  if (!recurring.ok) return recurring;

  // The edit has landed, so look the series up by its old key in the old data.
  const members = recurring.value.filter((t) => seriesKey(t) === seriesKey(before));
  const standsFor = recurringSeries([before, ...members])[0];
  if (standsFor?.id !== before.id) return unchanged;

  const earlier = members.filter((t) => t.id !== before.id).map((t) => t.id);
  return store.transactions.retag(userId, earlier, after);
}

/**
 * Stop a recurring expense counting from `today`. Logging it again later
 * starts it back up, because the new row has no end date.
 */
export async function stopRecurring(
  store: Store,
  userId: string,
  id: string,
  today: string
): Promise<WriteResult> {
  if (!id) return fail("Missing transaction id.");

  const stopped = await store.transactions.setEndsOn(userId, id, today);
  if (!stopped.ok) return failStore("stopRecurring", stopped.error, MESSAGES);
  if (!stopped.value) return fail("That isn't a repeating expense any more.");

  return ok(PAGES.dashboard, PAGES.transactions, PAGES.editTransaction);
}

export async function resumeRecurring(
  store: Store,
  userId: string,
  id: string
): Promise<WriteResult> {
  if (!id) return fail("Missing transaction id.");

  const resumed = await store.transactions.setEndsOn(userId, id, null);
  if (!resumed.ok) return failStore("resumeRecurring", resumed.error, MESSAGES);
  if (!resumed.value) return fail("That isn't a repeating expense any more.");

  return ok(PAGES.dashboard, PAGES.transactions, PAGES.editTransaction);
}
