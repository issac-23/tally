import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/ui/sign-out-button";
import { Logo } from "@/components/ui/logo";
import { formatCurrency } from "@/lib/utils/format";
import { monthlyBudgetLimit } from "@/lib/utils/runway";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("savings_balance, monthly_salary, onboarded")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarded) {
    redirect("/onboarding");
  }

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "there";

  const savings = Number(profile.savings_balance);
  const salary = Number(profile.monthly_salary);
  const budget = monthlyBudgetLimit(savings, salary);

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header */}
        <header className="flex items-center justify-between">
          <Logo size="md" withWordmark />
          <SignOutButton />
        </header>

        {/* Welcome */}
        <section className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
            Welcome, {displayName}.
          </h1>
          <p className="text-[var(--color-foreground-muted)]">
            Here's the lay of the land.
          </p>
        </section>

        {/* Numbers */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Savings balance"
            value={formatCurrency(savings)}
            hint="What you have on hand"
          />
          <StatCard
            label="Monthly salary"
            value={formatCurrency(salary)}
            hint="After-tax take-home"
          />
          <StatCard
            label="Recommended budget"
            value={formatCurrency(budget)}
            hint="Sustainable monthly spend"
            accent
          />
        </section>

        {/* Placeholder for runway + spending — Day 5+ */}
        <section className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-2xl p-8 shadow-sm">
          <h2 className="font-semibold text-[var(--color-foreground)] mb-2">
            Up next
          </h2>
          <ul className="text-sm text-[var(--color-foreground-muted)] space-y-1.5">
            <li>· Add your first expense</li>
            <li>· Runway indicator with color-coded status</li>
            <li>· Spending breakdown by category and merchant</li>
          </ul>
        </section>
      </div>
    </main>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}

function StatCard({ label, value, hint, accent }: StatCardProps) {
  return (
    <div
      className={`rounded-2xl p-5 shadow-sm border ${
        accent
          ? "bg-[var(--color-brand-subtle)] border-[var(--color-brand-light)]"
          : "bg-[var(--color-surface-raised)] border-[var(--color-border)]"
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-[var(--color-foreground-muted)] font-medium">
        {label}
      </p>
      <p
        className={`text-2xl font-bold mt-1.5 ${
          accent
            ? "text-[var(--color-brand)]"
            : "text-[var(--color-foreground)]"
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-[var(--color-foreground-subtle)] mt-1">
        {hint}
      </p>
    </div>
  );
}
