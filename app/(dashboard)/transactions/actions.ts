"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
