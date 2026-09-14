"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  validateTransactionInput,
  type TransactionInput,
} from "@/lib/utils/transaction-input";

export type CreateTransactionInput = TransactionInput;

export interface CreateTransactionResult {
  error?: string;
}

export async function createTransaction(
  input: CreateTransactionInput
): Promise<CreateTransactionResult> {
  const validated = validateTransactionInput(input);
  if (!validated.ok) {
    return { error: validated.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You're not signed in." };
  }

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    ...validated.fields,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  redirect("/dashboard");
}
