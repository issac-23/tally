import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";
import { CategoryForm } from "./category-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("savings_balance, monthly_salary")
    .eq("id", user.id)
    .maybeSingle();

  const savings = Number(profile?.savings_balance ?? 0);
  const salary = Number(profile?.monthly_salary ?? 0);

  // Only the user's own categories — presets aren't editable, so listing
  // them here would offer a Remove button that RLS would always reject.
  const { data: categoryData } = await supabase
    .from("categories")
    .select("id, name, color")
    .eq("user_id", user.id)
    .eq("is_preset", false)
    .order("name", { ascending: true });

  const customCategories = categoryData ?? [];

  return (
    <main className="px-4 py-6 sm:px-6 sm:py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-display font-display tracking-tight text-[var(--color-foreground)]">
            Settings
          </h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Update your savings balance and monthly salary. Tally recalculates
            your runway and budget the moment you save.
          </p>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6">
            <div className="mb-5 space-y-1">
              <h2 className="font-display text-h1 text-[var(--color-foreground)]">
                Money inputs
              </h2>
              <p className="text-sm text-[var(--color-foreground-muted)]">
                Tally uses these to calculate runway and budget.
              </p>
            </div>
            <SettingsForm initialSavings={savings} initialSalary={salary} />
          </div>

          <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6">
            <div className="mb-5 space-y-1">
              <h2 className="font-display text-h1 text-[var(--color-foreground)]">
                Custom categories
              </h2>
              <p className="text-sm text-[var(--color-foreground-muted)]">
                Add your own buckets for expenses that do not fit the presets.
              </p>
            </div>
            <CategoryForm categories={customCategories} />
          </div>
        </section>
      </div>
    </main>
  );
}
