import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  TransactionRow,
  type TransactionRowData,
} from "@/components/dashboard/transaction-row";
import { ExportTransactionsButton } from "@/components/dashboard/export-transactions-button";
import { formatCurrency } from "@/lib/utils/format";
import { groupByMonth } from "@/lib/utils/aggregation";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: transactionsData } = await supabase
    .from("transactions")
    .select(
      "id, amount, description, merchant, date, recurrence, category:categories(id, name, icon, color)"
    )
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const transactions = (transactionsData ?? []) as unknown as TransactionRowData[];

  const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <main className="px-4 py-6 sm:px-6 sm:py-10">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Title + add */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-display font-display tracking-tight text-[var(--color-foreground)]">
              Transactions
            </h1>
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {transactions.length} total · {formatCurrency(total)} spent
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <ExportTransactionsButton transactions={transactions} />
            <Link
              href="/transactions/new"
              className="btn-primary w-full px-4 py-2 text-sm sm:w-auto"
            >
              + Add expense
            </Link>
          </div>
        </div>

        {/* List, bucketed by month so a long history stays scannable */}
        {transactions.length > 0 ? (
          <div className="space-y-6">
            {groupByMonth(transactions).map((group) => (
              <section key={group.key} className="space-y-2">
                <div className="flex items-baseline justify-between gap-3 px-1">
                  <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
                    {group.label}
                  </h2>
                  <p className="text-sm tabular-nums text-[var(--color-foreground-muted)]">
                    {formatCurrency(group.total)}
                  </p>
                </div>
                <ul className="overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                  {group.transactions.map((t, i) => (
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
              </section>
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="bg-[var(--color-surface-raised)] border border-dashed border-[var(--color-border-strong)] rounded p-8 text-center space-y-3 sm:p-12">
      <Inbox
        size={32}
        className="mx-auto text-[var(--color-foreground-subtle)]"
        aria-hidden
      />
      <p className="font-medium text-[var(--color-foreground)]">
        No transactions yet
      </p>
      <p className="text-sm text-[var(--color-foreground-muted)] max-w-xs mx-auto">
        Log your first expense and Tally will start tracking your spending.
      </p>
      <Link
        href="/transactions/new"
        className="btn-primary mt-2 px-4 py-2 text-sm"
      >
        Add your first expense
      </Link>
    </div>
  );
}
