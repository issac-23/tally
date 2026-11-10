/**
 * Who is looking at the page, and the store to read and write through.
 *
 * Every signed-in page, and every write, asks here. The answer is one of:
 *
 *  - `user`: a real Supabase session, with a store over their own rows;
 *  - `demo`: a visitor who followed "Try the demo", with a read-only store
 *    over made-up data;
 *  - `anonymous`: neither.
 *
 * A real session always beats the demo cookie, so someone who clicked the
 * demo once and later signed in sees their own account.
 *
 * The demo branch never builds a Supabase client, and neither does a request
 * with no Supabase auth cookie, since there is no session to find. A
 * request is only sent to Supabase when it might hold a session.
 */

import { cache } from "react";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import {
  DEMO_COOKIE,
  hasSupabaseAuthCookie,
  isDemoCookie,
} from "@/lib/demo/cookie";
import { DEMO_USER_ID } from "@/lib/demo/data";
import { createReadOnlyDemoStore } from "@/lib/demo/read-only-store";
import { fixturesEnabled, getSignedIn } from "@/lib/supabase/server";
import type { Store } from "@/lib/store/types";

/** What the pages read off a user: an id and something to call them. */
export type SessionUser = Pick<User, "id" | "email" | "user_metadata">;

export type Session =
  | { kind: "user"; user: SessionUser; store: Store }
  | { kind: "demo"; user: SessionUser; store: Store }
  | { kind: "anonymous" };

export const DEMO_USER: SessionUser = {
  id: DEMO_USER_ID,
  email: undefined,
  user_metadata: { full_name: "Alex Demo" },
};

export interface SessionDeps {
  /**
   * Whether a Supabase session could exist: the request carries a Supabase
   * auth cookie, or the dev fixtures stand in for Supabase.
   */
  mightHaveSession: boolean;
  demoRequested: boolean;
  /** The real session, or null. Builds a Supabase client, so it is only called when it might find one. */
  signedIn: () => Promise<{ user: SessionUser; store: Store } | null>;
  demoStore: () => Store;
}

export async function resolveVisitor(deps: SessionDeps): Promise<Session> {
  if (deps.mightHaveSession) {
    const signedIn = await deps.signedIn();
    if (signedIn) return { kind: "user", ...signedIn };
  }
  if (deps.demoRequested) {
    return { kind: "demo", user: DEMO_USER, store: deps.demoStore() };
  }
  return { kind: "anonymous" };
}

/**
 * The visitor for this request. Memoised per request, so the layout and the
 * page that asks next share one answer and one Supabase call.
 */
export const resolveSession = cache(async (): Promise<Session> => {
  const jar = await cookies();
  return resolveVisitor({
    mightHaveSession:
      fixturesEnabled() || hasSupabaseAuthCookie(jar.getAll().map((c) => c.name)),
    demoRequested: isDemoCookie(jar.get(DEMO_COOKIE)?.value),
    signedIn: getSignedIn,
    demoStore: () => createReadOnlyDemoStore(),
  });
});
