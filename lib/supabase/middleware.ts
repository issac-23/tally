import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Local development fixtures — see lib/dev/fixtures.ts. Same literal
  // NODE_ENV guard as lib/supabase/server.ts, so this is dead code in a
  // production build. There is no fixture session to refresh, so the only
  // thing to reproduce is the route guard.
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.TALLY_DEV_FIXTURES === "1"
  ) {
    const scenario = request.cookies.get("tally_fx")?.value ?? "full";
    if (
      scenario.startsWith("signedout") &&
      request.nextUrl.pathname.startsWith("/dashboard")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect dashboard routes — redirect unauthenticated users to home
  if (
    !user &&
    request.nextUrl.pathname.startsWith("/dashboard")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
