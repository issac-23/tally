import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, NOT_SIGNED_IN, type Client, type WriteResult } from "./write";

/**
 * The part of a server action that is the same for every write: open the
 * client, require a signed-in user, run the entity's write, and refresh the
 * pages it says it touched. The action keeps only what is its own: its
 * name, its arguments and where it sends the user afterwards.
 */
export async function runWrite(
  write: (client: Client, userId: string) => Promise<WriteResult>
): Promise<WriteResult> {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return fail(NOT_SIGNED_IN);
  }

  const result = await write(client, user.id);
  if (result.ok) {
    for (const { path, type } of result.refresh) revalidatePath(path, type);
  }
  return result;
}
