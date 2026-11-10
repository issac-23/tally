import { NextResponse } from "next/server";
import { DEMO_COOKIE } from "@/lib/demo/cookie";

/** Leave the demo: clear the cookie and go back to the landing page. */
export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete(DEMO_COOKIE);
  return response;
}
