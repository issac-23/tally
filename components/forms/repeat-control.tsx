"use client";

import { useState, useTransition } from "react";
import {
  resumeRecurring,
  stopRecurring,
} from "@/app/(dashboard)/transactions/actions";
import { formatDayKey } from "@/lib/utils/calendar";

interface RepeatControlProps {
  id: string;
  /** The day it stopped counting, when it has. */
  endedOn: string | null;
}

/**
 * Ends a repeating expense, or starts it counting again.
 *
 * Deleting the rows would also delete the history, and a cancelled
 * subscription should stay in the record of what was spent.
 */
export function RepeatControl({ id, endedOn }: RepeatControlProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: (id: string) => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action(id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-2 border-t border-[var(--color-border)] pt-5">
      {endedOn ? (
        <>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Stopped on {formatDayKey(endedOn, { month: "long", day: "numeric", year: "numeric" })}.
            It no longer counts toward your runway.
          </p>
          <button
            type="button"
            onClick={() => run(resumeRecurring)}
            disabled={pending}
            className="text-sm font-medium text-[var(--color-brand)] hover:underline disabled:opacity-60"
          >
            {pending ? "Resuming…" : "Count it again"}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Cancelled it? Stop counting it toward your runway and keep the history.
          </p>
          <button
            type="button"
            onClick={() => run(stopRecurring)}
            disabled={pending}
            className="text-sm font-medium text-[var(--color-status-red)] hover:underline disabled:opacity-60"
          >
            {pending ? "Stopping…" : "Stop repeating"}
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-[var(--color-status-red)]">
          {error}
        </p>
      )}
    </div>
  );
}
