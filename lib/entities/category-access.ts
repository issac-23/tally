import type { Store } from "@/lib/store/types";

/** What the actions say when canUseCategory turns a category down. */
export const CATEGORY_UNAVAILABLE_MESSAGE =
  "That category isn't available. Pick another one.";

/**
 * Whether `userId` may file an expense under `categoryId`: a preset, or one
 * of their own.
 *
 * The transactions RLS policies only look at transactions.user_id, so without
 * this an expense could point at another user's category id. RLS on
 * categories already hides those rows from this lookup, and migration 008's
 * trigger refuses the write regardless; the explicit check says so in code
 * and answers before the write is attempted.
 */
export async function canUseCategory(
  store: Store,
  userId: string,
  categoryId: string
): Promise<boolean> {
  const found = await store.categories.find(categoryId);
  if (!found.ok || !found.value) return false;
  return found.value.is_preset || found.value.user_id === userId;
}
