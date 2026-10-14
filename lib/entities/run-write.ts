import { revalidatePath } from "next/cache";
import { createClient, createStore } from "@/lib/supabase/server";
import { fail, NOT_SIGNED_IN, type Store, type WriteResult } from "./write";

/**
 * The part of a server action that is the same for every write: require a
 * signed-in user, run the entity's write against the store, and refresh the
 * pages it said it touched. The action keeps only what is its own: its name,
 * its arguments and where it sends the user afterwards.
 */
export async function runWrite(
  write: (store: Store, userId: string) => Promise<WriteResult>
): Promise<WriteResult> {
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) {
    return fail(NOT_SIGNED_IN);
  }

  const result = await write(await createStore(), user.id);
  if (result.ok) {
    for (const { path, type } of result.refresh) revalidatePath(path, type);
  }
  return result;
}
