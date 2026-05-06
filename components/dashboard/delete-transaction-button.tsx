"use client";

import { useTransition } from "react";
import { deleteTransaction } from "@/app/(dashboard)/transactions/actions";

interface DeleteTransactionButtonProps {
  id: string;
}

export function DeleteTransactionButton({ id }: DeleteTransactionButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Delete this transaction? This can't be undone.")) return;
    startTransition(async () => {
      await deleteTransaction(id);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label="Delete transaction"
      className="shrink-0 p-2 -mr-2 rounded-lg text-[var(--color-foreground-subtle)] hover:text-[var(--color-status-red)] hover:bg-[var(--color-status-red-bg)] transition-colors disabled:opacity-50"
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
