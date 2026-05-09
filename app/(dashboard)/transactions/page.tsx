import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  TransactionRow,
  type TransactionRowData,
} from "@/components/dashboard/transaction-row";
import { formatCurrency } from "@/lib/utils/format";

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
      "id, amount, description, merchant, date, category:categories(id, name, icon, color)"
    )
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const transactions = (transactionsData ?? []) as unknown as TransactionRowData[];

  const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <main className="px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Title + add */}
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
              Transactions
            </h1>
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {transactions.length} total · {formatCurrency(total)} spent
            </p>
          </div>
          <Link
            href="/transactions/new"
            className="inline-flex items-center gap-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-light)] text-white font-medium rounded px-4 py-2 transition-colors text-sm"
          >
            + Add expense
          </Link>
        </div>

        {/* List */}
        {transactions.length > 0 ? (
          <ul className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded overflow-hidden">
            {transactions.map((t, i) => (
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
          <EmptyState />
        )}
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="bg-[var(--color-surface-raised)] border border-dashed border-[var(--color-border-strong)] rounded p-12 text-center space-y-3">
      <p className="text-3xl">📊</p>
      <p className="font-medium text-[var(--color-foreground)]">
        No transactions yet
      </p>
      <p className="text-sm text-[var(--color-foreground-muted)] max-w-xs mx-auto">
        Log your first expense and Tally will start tracking your spending.
      </p>
      <Link
        href="/transactions/new"
        className="inline-block mt-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-light)] text-white font-medium rounded px-4 py-2 transition-colors text-sm"
      >
        Add your first expense
      </Link>
    </div>
  );
}
