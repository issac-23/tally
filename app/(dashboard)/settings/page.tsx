import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <main className="px-6 py-10">
      <div className="max-w-md mx-auto space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
            Settings
          </h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Update your savings, salary, and preferences.
          </p>
        </div>

        <div className="bg-[var(--color-surface-raised)] border border-dashed border-[var(--color-border-strong)] rounded-2xl p-8 text-center space-y-2">
          <p className="text-2xl">🛠️</p>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Settings form is coming next. For now, your numbers are locked in
            from onboarding.
          </p>
        </div>
      </div>
    </main>
  );
}
