"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  validateTransactionInput,
  type TransactionInput,
} from "@/lib/utils/transaction-input";

export interface DeleteTransactionResult {
  error?: string;
}

export async function deleteTransaction(
  id: string
): Promise<DeleteTransactionResult> {
  if (!id) {
    return { error: "Missing transaction id." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You're not signed in." };
  }

  // RLS already restricts deletes to the owner, but the explicit user_id
  // filter makes the intent obvious in the SQL and avoids any ambiguity.
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return {};
}

export interface UpdateTransactionResult {
  error?: string;
}

export async function updateTransaction(
  id: string,
  input: TransactionInput
): Promise<UpdateTransactionResult> {
  if (!id) {
    return { error: "Missing transaction id." };
  }

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

  // Same belt-and-braces as delete: RLS is the real boundary, the explicit
  // user_id filter states the intent. Without it a wrong id would report
  // success against zero rows.
  const { data, error } = await supabase
    .from("transactions")
    .update(validated.fields)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "That expense no longer exists." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  redirect("/transactions");
}
