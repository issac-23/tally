/**
 * Shown on every dashboard page while someone is in the demo, so nobody
 * mistakes made-up numbers for their own. The sign-in link leaves the demo
 * and lands on the page with the sign-in button.
 *
 * A plain anchor and not a Link: following it clears a cookie, which a
 * prefetch must not do.
 */
export function DemoBanner() {
  return (
    <div
      role="status"
      className="border-b border-[var(--color-border)] bg-[var(--color-brand-subtle)] px-4 py-2 text-center text-sm text-[var(--color-foreground)]"
    >
      You&apos;re looking at a demo account.{" "}
      <a href="/demo/exit" className="font-medium underline underline-offset-2">
        Sign in
      </a>{" "}
      to use your own.
    </div>
  );
}
