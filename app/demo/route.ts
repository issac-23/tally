import { NextResponse } from "next/server";
import { DEMO_COOKIE, DEMO_COOKIE_VALUE, demoCookieOptions } from "@/lib/demo/cookie";

/**
 * Start the public demo: set the demo cookie and go to the dashboard.
 *
 * The cookie only asks for the demo account (see lib/session.ts), so there is
 * nothing to protect here and no need for a POST. A visitor who is already
 * signed in keeps their own account: a real session beats this cookie.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = NextResponse.redirect(new URL("/dashboard", url));
  response.cookies.set(
    DEMO_COOKIE,
    DEMO_COOKIE_VALUE,
    demoCookieOptions(url.protocol === "https:")
  );
  return response;
}
