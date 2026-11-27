"use server";

import { redirect } from "next/navigation";
import { runWrite } from "@/lib/entities/run-write";
import * as transactions from "@/lib/entities/transaction";
import { viewerTimeZone } from "@/lib/session";
import { dayKey } from "@/lib/utils/calendar";
import type { TransactionInput } from "@/lib/utils/transaction-input";

export interface DeleteTransactionResult {
  error?: string;
}

export interface UpdateTransactionResult {
  error?: string;
}

// Thin adapters over lib/entities/transaction; see settings/actions.ts.

export async function deleteTransaction(
  id: string
): Promise<DeleteTransactionResult> {
  const result = await runWrite((client, userId) =>
    transactions.deleteTransaction(client, userId, id)
  );
  return result.ok ? {} : { error: result.error };
}

export async function updateTransaction(
  id: string,
  input: TransactionInput
): Promise<UpdateTransactionResult> {
  const result = await runWrite((client, userId) =>
    transactions.updateTransaction(client, userId, id, input)
  );
  if (!result.ok) {
    return { error: result.error };
  }
  redirect("/transactions");
}

export async function stopRecurring(id: string): Promise<{ error?: string }> {
  // The viewer's day, so "stopped today" means their today.
  const today = dayKey(new Date(), await viewerTimeZone());
  const result = await runWrite((client, userId) =>
    transactions.stopRecurring(client, userId, id, today)
  );
  return result.ok ? {} : { error: result.error };
}

export async function resumeRecurring(id: string): Promise<{ error?: string }> {
  const result = await runWrite((client, userId) =>
    transactions.resumeRecurring(client, userId, id)
  );
  return result.ok ? {} : { error: result.error };
}
