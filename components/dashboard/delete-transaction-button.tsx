"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { deleteTransaction } from "@/app/(dashboard)/transactions/actions";

interface DeleteTransactionButtonProps {
  id: string;
}

const CONFIRM_TIMEOUT_MS = 3000;

export function DeleteTransactionButton({ id }: DeleteTransactionButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset to idle if the user doesn't confirm within the timeout window.
  useEffect(() => {
    if (!confirming) return;
    timeoutRef.current = setTimeout(() => {
      setConfirming(false);
    }, CONFIRM_TIMEOUT_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [confirming]);

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    startTransition(async () => {
      await deleteTransaction(id);
    });
  }

  if (confirming || isPending) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-label="Confirm delete"
        className="shrink-0 px-2.5 py-1.5 -mr-2 rounded text-xs font-medium bg-[var(--color-status-red-bg)] text-[var(--color-status-red)] hover:bg-[var(--color-status-red)] hover:text-white transition-colors disabled:opacity-60"
      >
        {/* transitions.dev text-states-swap: the label moves from the ask to
            the in-flight state instead of cutting between two words on the
            one control that destroys data. */}
        <SwapLabel value={isPending ? "Deleting…" : "Tap to confirm"} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Delete transaction"
      className="shrink-0 p-2 -mr-2 rounded text-[var(--color-foreground-muted)] hover:text-[var(--color-status-red)] hover:bg-[var(--color-status-red-bg)] transition-colors"
    >
      <TrashIcon />
    </button>
  );
}

/**
 * Three-phase swap from the transitions.dev snippet: exit up with blur,
 * change the text while it's invisible and parked below, then let it rise
 * back to rest.
 */
function SwapLabel({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || previous.current === value) return;
    previous.current = value;

    const dur =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--text-swap-dur"
        )
      ) || 150;

    el.classList.add("is-exit");
    const t = setTimeout(() => {
      el.textContent = value;
      el.classList.remove("is-exit");
      el.classList.add("is-enter-start");
      void el.offsetHeight; // force reflow so the return transitions
      el.classList.remove("is-enter-start");
    }, dur);

    return () => clearTimeout(t);
  }, [value]);

  return (
    <span ref={ref} className="t-text-swap">
      {value}
    </span>
  );
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 4h10M5.5 4V3a1 1 0 011-1h3a1 1 0 011 1v1M6.5 7v4M9.5 7v4M4 4l.5 8a1 1 0 001 1h5a1 1 0 001-1L12 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
