import { redirect } from "next/navigation";
import { createClient, createStore } from "@/lib/supabase/server";
import { orThrow } from "@/lib/store/types";
import { SettingsForm } from "./settings-form";
import { CategoryForm } from "./category-form";
import { IncomeSources } from "./income-sources";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const store = await createStore();
  const [profileResult, incomeResult, categoryResult] = await Promise.all([
    store.profiles.get(user.id),
    store.incomeSources.list(),
    // Only the user's own categories — presets aren't editable, so listing
    // them here would offer a Remove button that would always be refused.
    store.categories.listCustom(user.id),
  ]);

  const savings = orThrow(profileResult)?.savings_balance ?? 0;
  const incomeSources = orThrow(incomeResult);
  const customCategories = orThrow(categoryResult).map(({ id, name, color }) => ({
    id,
    name,
    color,
  }));

  return (
    <main className="px-4 py-6 sm:px-6 sm:py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-display font-display tracking-tight text-[var(--color-foreground)]">
            Settings
          </h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Update what you have and what comes in. Tally recalculates your
            runway and budget the moment you save.
          </p>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6">
            <div className="mb-5 space-y-1">
              <h2 className="font-display text-h1 text-[var(--color-foreground)]">
                Savings
              </h2>
              <p className="text-sm text-[var(--color-foreground-muted)]">
                What you have to fall back on. The runway divides this by what
                you burn.
              </p>
            </div>
            <SettingsForm initialSavings={savings} />
          </div>

          <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6">
            <div className="mb-5 space-y-1">
              <h2 className="font-display text-h1 text-[var(--color-foreground)]">
                Income
              </h2>
              <p className="text-sm text-[var(--color-foreground-muted)]">
                Everything coming in, at whatever cadence it arrives.
              </p>
            </div>
            <IncomeSources sources={incomeSources} />
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
