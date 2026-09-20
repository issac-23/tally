"use client";

import { useEffect } from "react";
import { ErrorPanel } from "@/components/ui/error-panel";

/**
 * The catch-all: the landing page, the sign-in screen, and anything else
 * that doesn't sit under a more specific boundary. Nested boundaries win
 * where they exist, so this stays deliberately vague — it can't know what
 * the user was doing.
 */
export default function RootError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[tally] render failed", error);
  }, [error]);

  return (
    <main className="px-6 py-20">
      <ErrorPanel
        title="Something went wrong"
        message="That didn't work. Trying again usually does it."
        digest={error.digest}
      >
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="btn-primary px-4 py-2 text-sm"
        >
          Try again
        </button>
      </ErrorPanel>
    </main>
  );
}
