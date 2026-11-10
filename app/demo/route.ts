import { NextResponse } from "next/server";
import {
  DEMO_COOKIE,
  DEMO_COOKIE_VALUE,
  demoCookieOptions,
  hasSupabaseAuthCookie,
} from "@/lib/demo/cookie";

/**
 * Start the public demo: set the demo cookie and go to the dashboard.
 *
 * The cookie only asks for the demo account (see lib/session.ts), so there is
 * nothing to protect here and no need for a POST. A visitor who is already
 * signed in keeps their own account, so they get no cookie at all: it would
 * bring the demo back the moment they signed out.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = NextResponse.redirect(new URL("/dashboard", url));
  const names = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((pair) => pair.split("=")[0].trim());
  if (hasSupabaseAuthCookie(names)) return response;
  response.cookies.set(
    DEMO_COOKIE,
    DEMO_COOKIE_VALUE,
    demoCookieOptions(url.protocol === "https:")
  );
  return response;
}
