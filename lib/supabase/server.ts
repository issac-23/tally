import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
