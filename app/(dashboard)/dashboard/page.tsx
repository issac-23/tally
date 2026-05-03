import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/ui/sign-out-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "there";

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-brand)] flex items-center justify-center shadow-sm">
              <span className="text-white text-base font-bold">T</span>
            </div>
            <span className="font-bold text-lg text-[var(--color-foreground)]">
              Tally
            </span>
          </div>
          <SignOutButton />
        </header>

        {/* Welcome */}
        <section className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
            Welcome, {displayName}.
          </h1>
          <p className="text-[var(--color-foreground-muted)]">
            You're signed in. The dashboard itself comes next.
          </p>
        </section>

        {/* Placeholder card */}
        <section className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-2xl p-8 shadow-sm">
          <h2 className="font-semibold text-[var(--color-foreground)] mb-2">
            Coming up
          </h2>
          <ul className="text-sm text-[var(--color-foreground-muted)] space-y-1.5">
            <li>· Onboarding — enter your savings and salary</li>
            <li>· Add an expense in seconds</li>
            <li>· Runway indicator (green / yellow / orange / red)</li>
            <li>· Spending pie charts by category and merchant</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
