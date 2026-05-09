import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

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
      <div className="max-w-md mx-auto space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
            Settings
          </h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Update your savings balance and monthly salary. Tally recalculates
            your runway and budget the moment you save.
          </p>
        </div>

        <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded p-6">
          <SettingsForm initialSavings={savings} initialSalary={salary} />
        </div>
      </div>
    </main>
  );
}
