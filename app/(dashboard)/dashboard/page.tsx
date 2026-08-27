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
      daysAgoIso(30)
    );

  const txs = recentTransactions ?? [];
  // No spending in the window means no burn rate, which means the runway and
  // projection have nothing real to say yet. Both cards switch to a
  // needs-data state rather than reporting "infinite runway" as good news.
  const hasSpendingData = txs.length > 0;
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
      daysAgoIso(60)
    );

  const txAgg = (txAggData ?? []) as unknown as Array<{
    amount: number | string;
    date: string;
    merchant: string | null;
    category: { id: string; name: string; icon: string; color: string } | null;
  }>;
  // Donuts and breakdowns only show the last 30 days of activity.
  const last30Cutoff = daysAgoIso(30);
  const last30 = txAgg.filter((t) => t.date >= last30Cutoff);
  const categorySlices = groupByCategory(last30);
  const merchantSlices = groupByMerchant(last30);
  const periodComparison = comparePeriods(txAgg);

  return (
    <main className="px-4 py-6 sm:px-6 sm:py-10">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">

        {/* Welcome + primary action */}
        <section className="flex items-start justify-between gap-4 flex-col sm:flex-row sm:items-end">
          <div className="space-y-2">
            <h1 className="text-display font-display tracking-tight text-[var(--color-foreground)]">
              Welcome, {displayName}.
            </h1>
            <p className="text-[var(--color-foreground-muted)]">
              Here&apos;s the lay of the land.
            </p>
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
              projection={projection}
              monthlySalary={salary}
              monthlyAvgSpend={avgSpend}
              hasSpendingData={hasSpendingData}
            />
          </div>
        </section>

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

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
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

