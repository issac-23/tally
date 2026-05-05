import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/ui/logo";
import { ExpenseForm } from "./expense-form";

export default async function NewTransactionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Fetch categories visible to this user (presets + their own).
  // RLS on the categories table enforces this; the order keeps presets first.
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, icon, color, is_preset")
    .order("is_preset", { ascending: false })
    .order("name", { ascending: true });

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-md mx-auto space-y-8">

        {/* Header */}
        <header className="flex items-center justify-between">
          <Link href="/dashboard">
            <Logo size="md" withWordmark />
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] transition-colors"
          >
            Cancel
          </Link>
        </header>

        {/* Title */}
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
            Add an expense
          </h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Quick log — only amount and category are required.
          </p>
        </div>

        {/* Form */}
        <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
          <ExpenseForm categories={categories ?? []} />
        </div>

      </div>
    </main>
  );
}
