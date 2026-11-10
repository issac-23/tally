import { revalidatePath } from "next/cache";
import { resolveSession } from "@/lib/session";
import { fail, NOT_SIGNED_IN, type Store, type WriteResult } from "./write";

/**
 * The part of a server action that is the same for every write: require a
 * visitor with a session, run the entity's write against the store, and refresh the
 * pages it said it touched. The action keeps only what is its own: its name,
 * its arguments and where it sends the user afterwards.
 */
export async function runWrite(
  write: (store: Store, userId: string) => Promise<WriteResult>
): Promise<WriteResult> {
  const session = await resolveSession();
  if (session.kind === "anonymous") {
    return fail(NOT_SIGNED_IN);
  }

  // The demo gets a store that turns every write down, so a demo visitor
  // reaches the same validation and the same message as anyone else.
  const result = await write(session.store, session.user.id);
  if (result.ok) {
    for (const { path, type } of result.refresh) revalidatePath(path, type);
  }
  return result;
}
