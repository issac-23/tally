"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Signing out ends with a trip through the exit route, which clears the demo
 * cookie. Left behind, it would drop a real user into the demo the moment
 * their session ended. A full navigation, not a router push, so the next page
 * is rendered with the cookie gone.
 */
export const SIGN_OUT_DESTINATION = "/demo/exit";

export async function signOutAndLeave(
  signOut: () => Promise<unknown>,
  navigate: (path: string) => void
) {
  await signOut();
  navigate(SIGN_OUT_DESTINATION);
}

/**
 * In the demo there is no session to end, so the same place leaves the demo
 * instead. It's a link to the route that clears the demo cookie, which a
 * script can't do: the cookie is httpOnly.
 */
export function SignOutButton({ demo = false }: { demo?: boolean }) {
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await signOutAndLeave(
      () => supabase.auth.signOut(),
      (path) => window.location.assign(path)
    );
  }

  if (demo) {
    return (
      <a
        href="/demo/exit"
        className="text-sm text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] transition-colors"
      >
        Exit demo
      </a>
    );
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="text-sm text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] transition-colors disabled:opacity-60"
    >
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}
