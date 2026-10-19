"use server";

import { redirect } from "next/navigation";
import { runWrite } from "@/lib/entities/run-write";
import * as transactions from "@/lib/entities/transaction";
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
