"use server";

import { redirect } from "next/navigation";
import { runWrite } from "@/lib/entities/run-write";
import * as transactions from "@/lib/entities/transaction";
import type { TransactionInput } from "@/lib/utils/transaction-input";

export type CreateTransactionInput = TransactionInput;

export interface CreateTransactionResult {
  error?: string;
}

// A thin adapter over lib/entities/transaction; see settings/actions.ts.
export async function createTransaction(
  input: CreateTransactionInput
): Promise<CreateTransactionResult> {
  const result = await runWrite((client, userId) =>
    transactions.createTransaction(client, userId, input)
  );
  if (!result.ok) {
    return { error: result.error };
  }
  redirect("/dashboard");
}
