import Link from "next/link";
import { SearchX } from "lucide-react";

/**
 * Editing an expense is the first route with an id in it, so it's the first
 * one a stale link or a deleted row can miss. Next's built-in 404 is a black
 * page rendered underneath the signed-in nav, which reads as a crash rather
 * than a missing record.
 */
export default function DashboardNotFound() {
  return (
    <main className="px-6 py-20">
      <div className="mx-auto max-w-sm space-y-4 rounded border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-8 text-center">
        <SearchX
          size={32}
          className="mx-auto text-[var(--color-foreground-subtle)]"
          aria-hidden
        />
        <h1 className="text-lg font-medium text-[var(--color-foreground)]">
          We couldn&rsquo;t find that
        </h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          It may have been deleted, or the link may be out of date.
        </p>
        <Link href="/transactions" className="btn-primary mt-2 px-4 py-2 text-sm">
          Back to transactions
        </Link>
      </div>
    </main>
  );
}
