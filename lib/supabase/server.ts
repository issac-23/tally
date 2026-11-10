import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createSupabaseStore } from "@/lib/store/supabase-store";
import type { Store } from "@/lib/store/types";
import type { SessionUser } from "@/lib/session";

export async function createClient() {
  const cookieStore = await cookies();

  // Local development fixtures — see lib/dev/fixtures.ts.
  //
  // The NODE_ENV comparison is deliberately first and deliberately literal:
  // Next.js substitutes it at build time, so in a production build this whole
  // branch is statically false and the import below is dropped from the
  // bundle. Setting TALLY_DEV_FIXTURES on a deployed environment cannot
  // enable this, because the code isn't shipped.
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.TALLY_DEV_FIXTURES === "1"
  ) {
    const { createFixtureAuthClient } = await import("@/lib/dev/fixtures");
    const scenario = cookieStore.get("tally_fx")?.value ?? "full";
    return createFixtureAuthClient({ scenario }) as never;
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — middleware refreshes sessions
          }
        },
      },
    }
  );
}

/**
 * Whether the dev fixtures stand in for Supabase. The same literal NODE_ENV
 * comparison as the two guards below, so it is `false` in a production build.
 * It only says whether to ask `createClient` for a session; the fixtures
 * themselves are imported behind the guards in `createClient` and
 * `createStore`.
 */
export function fixturesEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.TALLY_DEV_FIXTURES === "1"
  );
}

/**
 * The store the app reads and writes through, over the Supabase client the
 * session was read with. Auth still comes from `createClient`; this is the
 * data side.
 *
 * The same literal NODE_ENV guard as in `createClient`, for the same reason:
 * in a production build the fixture branch is statically false and
 * lib/dev/fixtures.ts is dropped from the bundle.
 */
export async function createStore(
  client: Awaited<ReturnType<typeof createClient>>
): Promise<Store> {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.TALLY_DEV_FIXTURES === "1"
  ) {
    const { createFixtureStore } = await import("@/lib/dev/fixtures");
    const cookieStore = await cookies();
    const scenario = cookieStore.get("tally_fx")?.value ?? "full";
    return createFixtureStore({ scenario });
  }

  return createSupabaseStore(client);
}

/**
 * The signed-in user and their store, or null when nobody is signed in.
 * One client serves both, so a page doesn't build two. Pages go through
 * `resolveSession` in lib/session.ts, which also knows about the demo.
 */
export async function getSignedIn(): Promise<{
  user: SessionUser;
  store: Store;
} | null> {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;
  return { user, store: await createStore(client) };
}
