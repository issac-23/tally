import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/ui/sign-out-button";
import { Logo } from "@/components/ui/logo";
import { RunwayCard } from "@/components/dashboard/runway-card";
import { formatCurrency } from "@/lib/utils/format";
import { calculateRunway } from "@/lib/utils/runway";
import { monthlyAverageSpend } from "@/lib/utils/spending";

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

  // Pull last 30 days of transactions to compute the runway baseline.
  const { data: recentTransactions } = await supabase
    .from("transactions")
    .select("amount, date")
    .gte(
      "date",
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10)
    );

  const avgSpend = monthlyAverageSpend(recentTransactions ?? []);
  const runway = calculateRunway(savings, salary, avgSpend);
  const budget = runway.monthly_budget_limit;

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header */}
        <header className="flex items-center justify-between">
          <Logo size="md" withWordmark />
          <SignOutButton />
        </header>

        {/* Welcome + primary action */}
        <section className="flex items-end justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
              Welcome, {displayName}.
            </h1>
            <p className="text-[var(--color-foreground-muted)]">
              Here's the lay of the land.
            </p>
          </div>
          <Link
            href="/transactions/new"
            className="inline-flex items-center gap-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-light)] text-white font-medium rounded-xl px-4 py-2.5 transition-colors text-sm shadow-sm"
          >
            <PlusIcon />
            New expense
          </Link>
        </section>

        {/* Runway */}
        <RunwayCard runway={runway} />

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

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
