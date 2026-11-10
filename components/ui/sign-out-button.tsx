"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * In the demo there is no session to end, so the same place leaves the demo
 * instead. It's a link to the route that clears the demo cookie, which a
 * script can't do: the cookie is httpOnly.
 */
export function SignOutButton({ demo = false }: { demo?: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
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
