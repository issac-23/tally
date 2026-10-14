import { redirect } from "next/navigation";
import { createClient, createStore } from "@/lib/supabase/server";
import { orThrow } from "@/lib/store/types";
import { Logo } from "@/components/ui/logo";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const profile = orThrow(await (await createStore()).profiles.get(user.id));

  // Already onboarded — straight to dashboard.
  if (profile?.onboarded) {
    redirect("/dashboard");
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-10">
      <div className="w-full max-w-md space-y-8">

        <div className="flex flex-col items-center gap-4 text-center">
          <Logo size="lg" />
          <div className="space-y-1.5">
            <h1 className="text-display font-display tracking-tight text-[var(--color-foreground)]">
              Welcome to Tally.
            </h1>
            <p className="text-sm text-[var(--color-foreground-muted)] leading-relaxed">
              Two quick numbers to set you up. Tally uses these
              to calculate your runway and budget.
            </p>
          </div>
        </div>

        <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded p-6">
          <OnboardingForm initialSavings={profile?.savings_balance ?? 0} />
        </div>

      </div>
    </main>
  );
}
