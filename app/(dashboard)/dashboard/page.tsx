import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { RunwayCard } from "@/components/dashboard/runway-card";
import { SavingsProjectionSection } from "@/components/dashboard/savings-projection";
import { SpendingBreakdown } from "@/components/dashboard/spending-breakdown";
import {
  TransactionRow,
  type TransactionRowData,
} from "@/components/dashboard/transaction-row";
import { formatCurrency } from "@/lib/utils/format";
import { calculateRunway } from "@/lib/utils/runway";
import { projectSavings } from "@/lib/utils/projection";
import { monthlyAverageSpend, spendingSummary } from "@/lib/utils/spending";
import {
  groupByCategory,
  groupByMerchant,
  comparePeriods,
} from "@/lib/utils/aggregation";

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

  const txs = recentTransactions ?? [];
  const avgSpend = monthlyAverageSpend(txs);
  const runway = calculateRunway(savings, salary, avgSpend);
  const projection = projectSavings(savings, salary, avgSpend);
  const summary = spendingSummary(txs);

  // Latest 5 transactions with category info, for the "Recent" section.
  // Supabase types the joined `category` as an array, but with a single FK it's
  // always one row, so we narrow it for the row component.
  const { data: recentData } = await supabase
    .from("transactions")
    .select(
      "id, amount, description, merchant, date, category:categories(id, name, icon, color)"
    )
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  const recent = (recentData ?? []) as unknown as TransactionRowData[];

  // 60-day window with category + merchant, used for both donuts + delta.
  const { data: txAggData } = await supabase
    .from("transactions")
    .select(
      "amount, date, merchant, category:categories(id, name, icon, color)"
    )
    .gte(
      "date",
      new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10)
    );

  const txAgg = (txAggData ?? []) as unknown as Array<{
    amount: number | string;
    date: string;
    merchant: string | null;
    category: { id: string; name: string; icon: string; color: string } | null;
  }>;
  // Donuts and breakdowns only show the last 30 days of activity.
  const last30Cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const last30 = txAgg.filter((t) => t.date >= last30Cutoff);
  const categorySlices = groupByCategory(last30);
  const merchantSlices = groupByMerchant(last30);
  const periodComparison = comparePeriods(txAgg);

  return (
    <main className="px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Welcome + primary action */}
        <section className="flex items-end justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <h1 className="text-display font-display tracking-tight text-[var(--color-foreground)]">
              Welcome, {displayName}.
            </h1>
            <p className="text-[var(--color-foreground-muted)]">
              Here's the lay of the land.
            </p>
          </div>
          <Link
            href="/transactions/new"
            className="inline-flex items-center gap-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-light)] text-white font-medium rounded px-4 py-2.5 transition-colors text-sm"
          >
            <Plus size={16} />
            New expense
          </Link>
        </section>

        {/* Runway */}
        <RunwayCard runway={runway} />

        {/* Savings projection chart */}
        <SavingsProjectionSection
          projection={projection}
          monthlySalary={salary}
          monthlyAvgSpend={avgSpend}
        />

        {/* Spending breakdowns side by side */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SpendingBreakdown
            title="Spending by category"
            slices={categorySlices}
            comparison={periodComparison}
          />
          <SpendingBreakdown
            title="Spending by merchant"
            slices={merchantSlices}
            emptyMessage="No merchants tracked yet. Add a merchant when you log an expense to see this break down."
          />
        </section>

        {/* Spending summary */}
        <section className="grid grid-cols-3 gap-4">
          <SummaryCard label="Today" amount={summary.today} />
          <SummaryCard label="This week" amount={summary.this_week} />
          <SummaryCard label="This month" amount={summary.this_month} />
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
                className="text-sm text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] transition-colors"
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
    <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded p-4">
      <p className="text-xs uppercase tracking-widest text-[var(--color-foreground-muted)] font-medium">
        {label}
      </p>
      <p className="text-xl sm:text-2xl font-bold mt-1 text-[var(--color-foreground)]">
        {formatCurrency(amount)}
      </p>
    </div>
  );
}

