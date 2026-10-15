import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Whether `userId` may file an expense under `categoryId`: a preset, or one
 * of their own.
 *
 * The transactions RLS policies only look at transactions.user_id, so without
 * this an expense could point at another user's category id. RLS on
 * categories already hides those rows from this query; the explicit check
 * says so in code rather than leaving it implied.
 */
export async function canUseCategory(
  supabase: Client,
  userId: string,
  categoryId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, user_id, is_preset")
    .eq("id", categoryId)
    .maybeSingle();

  if (error || !data) return false;
  return data.is_preset === true || data.user_id === userId;
}
