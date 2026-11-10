import { redirect } from "next/navigation";
import { resolveSession } from "@/lib/session";
import { SignInButton } from "@/components/ui/sign-in-button";
import { Logo } from "@/components/ui/logo";

export default async function Home() {
  // Only a real session skips the landing page. A demo visitor who comes
  // back here is leaving the demo, and should see the way in again.
  const session = await resolveSession();
  if (session.kind === "user") {
    redirect("/dashboard");
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="w-full max-w-md text-center space-y-8">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <Logo size="lg" />
          <h1 className="text-display font-display tracking-tight text-[var(--color-foreground)]">
            Tally
          </h1>
          <p className="text-[var(--color-foreground-muted)] text-base leading-relaxed">
            Track your spending. Understand your runway.<br />
            Stay in control of your money.
          </p>
        </div>

        {/* Sign in card */}
        <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded p-8 space-y-4">
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Sign in to get started — your data stays private to you.
          </p>

          <SignInButton />

          {/* A plain anchor and not a Link: following it sets a cookie, which
              a prefetch must not do. */}
          <a
            href="/demo"
            className="block w-full rounded border border-[var(--color-border-strong)] px-4 py-3 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface)]"
          >
            Try the demo
          </a>
          <p className="text-xs text-[var(--color-foreground-muted)]">
            A look around a sample account. No sign-in, nothing is saved.
          </p>
        </div>

        {/* Footer */}
        <p className="text-xs text-[var(--color-foreground-muted)]">
          Open source · Private data per user · Built with Next.js + Supabase
        </p>
      </div>
    </main>
  );
}
