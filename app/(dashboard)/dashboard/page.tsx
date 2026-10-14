import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox, Plus } from "lucide-react";
import { createClient, createStore } from "@/lib/supabase/server";
import { RunwayCard } from "@/components/dashboard/runway-card";
import { SavingsProjectionSection } from "@/components/dashboard/savings-projection";
import { SpendingBreakdown } from "@/components/dashboard/spending-breakdown";
import { CommittedPanel } from "@/components/dashboard/committed-panel";
import { TransactionRow } from "@/components/dashboard/transaction-row";
import { formatCurrency } from "@/lib/utils/format";
import { loadFinancialPicture } from "@/lib/finance/financial-picture";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const result = await loadFinancialPicture(await createStore(), user.id);

  if (result.status === "needs-onboarding") {
    redirect("/onboarding");
  }
  if (result.status === "unavailable") {
    // A failed read is not an empty account. Throwing hands it to
    // dashboard/error.tsx, which says so and offers a retry, rather than
    // drawing zeros that look like real numbers.
    throw new Error("The financial picture could not be read.");
  }

  const {
    savings,
    monthlyIncome,
    incomeSchedule,
    burnRate,
    hasSpendingData,
    runway,
    projectionScale,
    spending: summary,
    commitments,
    categorySlices,
    merchantSlices,
    periodComparison,
    recent,
  } = result.picture;

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "there";

  return (
    <main className="px-4 py-6 sm:px-6 sm:py-10">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">

        {/* Welcome + primary action */}
        <section className="flex items-start justify-between gap-4 flex-col sm:flex-row sm:items-end">
          <div>
            <h1 className="text-display font-display tracking-tight text-[var(--color-foreground)]">
              Welcome, {displayName}.
            </h1>
          </div>
          <Link
            href="/transactions/new"
            className="btn-primary w-full px-4 py-2.5 text-sm sm:w-auto"
          >
            <Plus size={16} />
            New expense
          </Link>
        </section>

        {/* Runway + today/week/month on the left, projection chart on the right */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-4">
            <RunwayCard runway={runway} hasSpendingData={hasSpendingData} />
            {/* "Last 7 / 30 days" rather than "This week / month": the util
                measures trailing windows, not calendar periods. It also stops
                the longest label wrapping in a 3-up grid on a phone. */}
            <div className="grid grid-cols-3 gap-3">
              <SummaryCard label="Today" amount={summary.today} />
              <SummaryCard label="Last 7 days" amount={summary.this_week} />
              <SummaryCard label="Last 30 days" amount={summary.this_month} />
            </div>
          </div>
          <div className="lg:col-span-2">
            <SavingsProjectionSection
              scale={projectionScale}
              savings={savings}
              monthlyIncome={monthlyIncome}
              incomeSchedule={incomeSchedule}
              monthlyAvgSpend={burnRate}
              hasSpendingData={hasSpendingData}
            />
          </div>
        </section>

        {/* Sits directly under the runway, because it explains the burn rate
            the runway is built on: how much of it you can't choose. */}
        <CommittedPanel summary={commitments} />

        {/* Spending breakdowns side by side */}
        {/* items-start so the shorter card keeps its own height instead of
            stretching to match its neighbour and trailing empty space. */}
        <section className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          <SpendingBreakdown
            title="Spending by category"
            slices={categorySlices}
            comparison={periodComparison}
          />
          <SpendingBreakdown
            title="Spending by merchant"
            slices={merchantSlices}
            maxItems={8}
            emptyMessage="No merchants tracked yet. Add a merchant when you log an expense to see this break down."
          />
        </section>

        {/* Recent transactions */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[var(--color-foreground)]">
              Recent transactions
            </h2>
            {recent.length > 0 && (
              <Link
                href="/transactions"
                className="shrink-0 text-sm text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] transition-colors"
              >
                See all →
              </Link>
            )}
          </div>

          {recent.length > 0 ? (
            <ul className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded overflow-hidden">
              {recent.map((t, i) => (
                <li
                  key={t.id}
                  className={
                    i > 0 ? "border-t border-[var(--color-border)]" : ""
                  }
                >
                  <TransactionRow transaction={t} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="bg-[var(--color-surface-raised)] border border-dashed border-[var(--color-border-strong)] rounded p-8 text-center space-y-2">
              <Inbox
                size={28}
                className="mx-auto text-[var(--color-foreground-subtle)]"
                aria-hidden
              />
              <p className="text-sm text-[var(--color-foreground-muted)]">
                No transactions yet. Log your first one to get started.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

interface SummaryCardProps {
  label: string;
  amount: number;
}

function SummaryCard({ label, amount }: SummaryCardProps) {
  return (
    <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded p-4 min-w-0">
      <p className="text-xs uppercase tracking-widest text-[var(--color-foreground-muted)] font-medium">
        {label}
      </p>
      <p className="text-xl sm:text-2xl font-bold mt-1 text-[var(--color-foreground)] tabular-nums">
        {formatCurrency(amount)}
      </p>
    </div>
  );
}

