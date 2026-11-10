import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveSession } from "@/lib/session";
import { orThrow } from "@/lib/store/types";
import { ExpenseForm } from "@/components/forms/expense-form";

export default async function NewTransactionPage() {
  const session = await resolveSession();
  if (session.kind === "anonymous") {
    redirect("/");
  }
  const { store } = session;

  // Categories visible to this user (presets + their own), presets first.
  const categories = orThrow(await store.categories.listVisible());

  return (
    <main className="px-6 py-10">
      <div className="max-w-md mx-auto space-y-8">

        {/* Title */}
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-1.5">
            <h1 className="text-display font-display tracking-tight text-[var(--color-foreground)]">
              Add an expense
            </h1>
            <p className="text-sm text-[var(--color-foreground-muted)]">
              Quick log, only amount and category are required.
            </p>
          </div>
          <Link
            href="/transactions"
            className="text-sm text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] transition-colors shrink-0"
          >
            Cancel
          </Link>
        </div>

        {/* Form */}
        <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded p-6">
          <ExpenseForm categories={categories ?? []} />
        </div>

      </div>
    </main>
  );
}
