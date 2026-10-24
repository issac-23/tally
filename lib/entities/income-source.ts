/** Writing income sources: create and delete. */

import { MAX_INCOME_SOURCES, rowLimitMessage } from "@/lib/utils/limits";
import { validateIncomeInput, type IncomeInput } from "@/lib/utils/income";
import { fail, failStore, ok, PAGES, type Store, type WriteResult } from "./write";

const MESSAGES = {
  rowLimit: rowLimitMessage(MAX_INCOME_SOURCES, "income sources"),
};

// Income feeds the dashboard's runway and projection, and is listed in
// Settings.
function changed(): WriteResult {
  return ok(PAGES.dashboard, PAGES.settings);
}

export async function createIncomeSource(
  store: Store,
  userId: string,
  input: IncomeInput
): Promise<WriteResult> {
  const validated = validateIncomeInput(input);
  if (!validated.ok) return fail(validated.error);

  const added = await store.incomeSources.add(userId, validated.fields);
  if (!added.ok) return failStore("createIncomeSource", added.error, MESSAGES);

  return changed();
}

export async function deleteIncomeSource(
  store: Store,
  userId: string,
  id: string
): Promise<WriteResult> {
  if (!id) return fail("Missing income source id.");

  const removed = await store.incomeSources.remove(userId, id);
  if (!removed.ok) return failStore("deleteIncomeSource", removed.error);

  return changed();
}
