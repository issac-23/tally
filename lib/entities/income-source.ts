/** Writing income sources: create and delete. */

import { MAX_INCOME_SOURCES, rowLimitMessage } from "@/lib/utils/limits";
import { validateIncomeInput, type IncomeInput } from "@/lib/utils/income";
import { fail, failDb, ok, PAGES, type Client, type WriteResult } from "./write";

const MESSAGES = {
  rowLimit: rowLimitMessage(MAX_INCOME_SOURCES, "income sources"),
};

// Income feeds the dashboard's runway and projection, and is listed in
// Settings.
function changed(): WriteResult {
  return ok(PAGES.dashboard, PAGES.settings);
}

export async function createIncomeSource(
  client: Client,
  userId: string,
  input: IncomeInput
): Promise<WriteResult> {
  const validated = validateIncomeInput(input);
  if (!validated.ok) return fail(validated.error);

  const { error } = await client
    .from("income_sources")
    .insert({ user_id: userId, ...validated.fields });
  if (error) return failDb("createIncomeSource", error, MESSAGES);

  return changed();
}

export async function deleteIncomeSource(
  client: Client,
  userId: string,
  id: string
): Promise<WriteResult> {
  if (!id) return fail("Missing income source id.");

  // RLS is the real boundary; the explicit user_id filter states the intent.
  const { error } = await client
    .from("income_sources")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) return failDb("deleteIncomeSource", error);

  return changed();
}
