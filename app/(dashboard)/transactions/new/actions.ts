"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface CreateTransactionInput {
  amount: number;
  category_id: string;
  description?: string;
  merchant?: string;
  date: string; // YYYY-MM-DD
}

export interface CreateTransactionResult {
  error?: string;
}

export async function createTransaction(
  input: CreateTransactionInput
): Promise<CreateTransactionResult> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { error: "Amount must be greater than zero." };
  }
  if (!input.category_id) {
    return { error: "Pick a category." };
  }
  if (!input.date) {
    return { error: "Pick a date." };
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
    amount: input.amount,
    category_id: input.category_id,
    description: input.description || null,
    merchant: input.merchant || null,
    date: input.date,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  redirect("/dashboard");
}
