/**
 * The demo cookie, and the Supabase auth cookie it has to be told apart from.
 *
 * The demo cookie is not a credential. It asks the app to show the public
 * demo account, which anyone can already see by following the "Try the demo"
 * link, so forging it gains nothing: the demo path never builds a Supabase
 * client and reads only from seed data (lib/demo/read-only-store.ts).
 */

export const DEMO_COOKIE = "tally_demo";

/** The value the demo cookie carries. Anything else is not the demo. */
export const DEMO_COOKIE_VALUE = "1";

export function demoCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure,
    // No maxAge or expires: gone when the browser session ends.
  };
}

export function isDemoCookie(value: string | undefined): boolean {
  return value === DEMO_COOKIE_VALUE;
}

/**
 * Supabase keeps its session in `sb-<project>-auth-token`, split into
 * `.0`, `.1` chunks when it is too big for one cookie. The PKCE
 * `-code-verifier` cookie that sign-in leaves behind is not a session.
 */
const SUPABASE_AUTH_COOKIE = /^sb-.+-auth-token(\.\d+)?$/;

export function hasSupabaseAuthCookie(names: Iterable<string>): boolean {
  for (const name of names) {
    if (SUPABASE_AUTH_COOKIE.test(name)) return true;
  }
  return false;
}

export interface VisitorCookies {
  /** A Supabase session could exist: an auth cookie is there, or fixtures stand in for Supabase. */
  mightHaveSession: boolean;
  demoRequested: boolean;
}

/**
 * The one place that reads a request's cookies to decide who might be
 * looking: used by the route guard and by resolveSession, so they cannot
 * disagree. `fixtures` is the dev fixtures flag, which counts as a possible
 * session because the fixture store answers in Supabase's place.
 */
export function classifyVisitor(
  cookies: Iterable<{ name: string; value: string }>,
  fixtures = false
): VisitorCookies {
  const all = [...cookies];
  return {
    mightHaveSession:
      fixtures || hasSupabaseAuthCookie(all.map((c) => c.name)),
    demoRequested: isDemoCookie(all.find((c) => c.name === DEMO_COOKIE)?.value),
  };
}
