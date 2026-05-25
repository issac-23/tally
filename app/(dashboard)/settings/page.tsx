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

  return (
    <main className="px-6 py-10">
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
            <CategoryForm />
          </div>
        </section>
      </div>
    </main>
  );
}
