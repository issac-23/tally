import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createSupabaseStore } from "@/lib/store/supabase-store";
import type { Store } from "@/lib/store/types";

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
    const { createFixtureClient } = await import("@/lib/dev/fixtures");
    const scenario = cookieStore.get("tally_fx")?.value ?? "full";
    return createFixtureClient({ scenario }) as never;
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
 * The store the app reads and writes through. Auth still comes from
 * `createClient`; this is the data side.
 *
 * The same literal NODE_ENV guard as in `createClient`, for the same reason:
 * in a production build the fixture branch is statically false and
 * lib/dev/fixtures.ts is dropped from the bundle.
 */
export async function createStore(): Promise<Store> {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.TALLY_DEV_FIXTURES === "1"
  ) {
    const { createFixtureStore } = await import("@/lib/dev/fixtures");
    const cookieStore = await cookies();
    const scenario = cookieStore.get("tally_fx")?.value ?? "full";
    return createFixtureStore({ scenario });
  }

  return createSupabaseStore(await createClient());
}
