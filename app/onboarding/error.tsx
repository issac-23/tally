"use client";

import { useEffect } from "react";
import { ErrorPanel } from "@/components/ui/error-panel";

/**
 * Onboarding sits outside the (dashboard) group, so the boundary there
 * doesn't cover it. Failing here is worse than failing on the dashboard:
 * it's the first screen after sign-in, with nothing behind it to go back to.
 */
export default function OnboardingError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[tally] onboarding render failed", error);
  }, [error]);

  return (
    <main className="px-6 py-20">
      <ErrorPanel
        title="We couldn't start setting you up"
        message="Something went wrong on the way to your account. Nothing has been saved yet."
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
