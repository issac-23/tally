import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ExpenseForm,
  type EditableTransaction,
} from "@/components/forms/expense-form";

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

  // Both queries are independent, so pay for one round trip rather than two.
  const [{ data: transaction }, { data: categories }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, amount, category_id, description, merchant, date, recurrence")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("categories")
      .select("id, name, icon, color, is_preset")
      .order("is_preset", { ascending: false })
      .order("name", { ascending: true }),
  ]);

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
            categories={categories ?? []}
            transaction={transaction as unknown as EditableTransaction}
          />
        </div>
      </div>
    </main>
  );
}
