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
        className="shrink-0 px-2.5 py-1.5 -mr-2 rounded-lg text-xs font-medium bg-[var(--color-status-red-bg)] text-[var(--color-status-red)] hover:bg-[var(--color-status-red)] hover:text-white transition-colors disabled:opacity-60"
      >
        {isPending ? "Deleting..." : "Tap to confirm"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Delete transaction"
      className="shrink-0 p-2 -mr-2 rounded-lg text-[var(--color-foreground-subtle)] hover:text-[var(--color-status-red)] hover:bg-[var(--color-status-red-bg)] transition-colors"
    >
      <TrashIcon />
    </button>
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
