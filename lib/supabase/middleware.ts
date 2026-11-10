import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { classifyVisitor } from "@/lib/demo/cookie";
import { isProtectedRoute } from "@/lib/utils/nav";

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
      isProtectedRoute(request.nextUrl.pathname)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // The demo cookie is not a credential: forging it only ever yields the
  // demo, because the demo path never builds a Supabase client and reads
  // nothing but seed data (see lib/session.ts). So it is enough to let the
  // request through the route guard.
  //
  // With no Supabase auth cookie there is no session to refresh or find, so
  // skip the Supabase call entirely: a protected route needs the demo, and
  // anything else passes through. With one, carry on as usual: a real
  // session beats the demo, and resolveSession decides which the page gets.
  const { mightHaveSession, demoRequested: demo } = classifyVisitor(
    request.cookies.getAll()
  );
  if (!mightHaveSession) {
    if (!demo && isProtectedRoute(request.nextUrl.pathname)) {
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

  // Protect signed-in routes: redirect unauthenticated users to home. A
  // demo visitor whose Supabase cookie has gone stale is let through, to
  // the demo.
  if (!user && !demo && isProtectedRoute(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
