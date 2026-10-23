import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, createStore } from "@/lib/supabase/server";
import { orThrow } from "@/lib/store/types";
import { ExpenseForm } from "@/components/forms/expense-form";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Both reads are independent, so pay for one round trip rather than two.
  const store = await createStore();
  const [transactionResult, categoriesResult] = await Promise.all([
    store.transactions.get(user.id, id),
    store.categories.listVisible(),
  ]);
  const transaction = orThrow(transactionResult);
  const categories = orThrow(categoriesResult);

  // RLS means someone else's row reads as missing, which is the right
  // answer to show either way: a 404, not a "you can't see this".
  if (!transaction) {
    notFound();
  }

  return (
    <main className="px-6 py-10">
      <div className="max-w-md mx-auto space-y-8">
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-1.5">
            <h1 className="text-display font-display tracking-tight text-[var(--color-foreground)]">
              Edit expense
            </h1>
            <p className="text-sm text-[var(--color-foreground-muted)]">
              Changes apply to your runway straight away.
            </p>
          </div>
          <Link
            href="/transactions"
            className="text-sm text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] transition-colors shrink-0"
          >
            Cancel
          </Link>
        </div>

        <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded p-6">
          <ExpenseForm
            categories={categories}
            transaction={transaction}
          />
        </div>
      </div>
    </main>
  );
}
