"use client";

import { ErrorPanel } from "@/components/ui/error-panel";

/**
 * Covers every signed-in screen. Almost always a Supabase query that
 * failed — the project paused, the network dropped, RLS rejected
 * something — so the copy points at the data rather than the app.
 */
export default function DashboardError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  // Next 16 renamed this from `reset`. It re-fetches the segment rather
  // than just clearing the error state, which is what a paused database
  // coming back needs.
  unstable_retry: () => void;
}) {
  return (
    <main className="px-6 py-20">
      <ErrorPanel
        title="We couldn't load your numbers"
        message="Something went wrong reading your account. Your data is fine — this is a problem on the way to it."
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
