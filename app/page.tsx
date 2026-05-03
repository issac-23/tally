import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignInButton } from "@/components/ui/sign-in-button";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="w-full max-w-md text-center space-y-8">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-brand)] flex items-center justify-center shadow-md">
            <span className="text-white text-2xl font-bold">T</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
            Tally
          </h1>
          <p className="text-[var(--color-foreground-muted)] text-base leading-relaxed">
            Track your spending. Understand your runway.<br />
            Stay in control of your money.
          </p>
        </div>

        {/* Sign in card */}
        <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-2xl p-8 shadow-sm space-y-4">
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Sign in to get started — your data stays private to you.
          </p>

          <SignInButton />
        </div>

        {/* Footer */}
        <p className="text-xs text-[var(--color-foreground-subtle)]">
          Open source · Private data per user · Built with Next.js + Supabase
        </p>
      </div>
    </main>
  );
}
