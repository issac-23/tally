import { NextResponse } from "next/server";
import { DEMO_COOKIE } from "@/lib/demo/cookie";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    // Always the dashboard. This used to honour a `next` query param, which
    // was glued straight onto the origin — `?next=@evil.example` turned the
    // redirect into `${origin}@evil.example`, which the browser reads as
    // userinfo and sends the user to evil.example. Nothing in the app sets
    // `next`, so there's nothing to sanitise; it's simply gone.
    if (!error) {
      const response = NextResponse.redirect(`${origin}/dashboard`);
      // A real session beats the demo cookie anyway, but there is no reason
      // to keep it once they've signed in, and it would bring the demo back
      // the moment they signed out.
      response.cookies.delete(DEMO_COOKIE);
      return response;
    }
  }

  // Something went wrong — send them home with an error flag
  return NextResponse.redirect(`${origin}/?error=auth_failed`);
}
