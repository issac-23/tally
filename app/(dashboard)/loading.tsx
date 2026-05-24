import { Logo } from "@/components/ui/logo";

export default function DashboardLoading() {
  return (
    <main className="px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <div className="h-8 w-56 animate-pulse rounded bg-[var(--color-surface)]" />
            <div className="h-4 w-40 animate-pulse rounded bg-[var(--color-surface)]" />
          </div>
          <div className="h-10 w-full animate-pulse rounded bg-[var(--color-surface)] sm:w-32" />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4">
            <SkeletonCard className="h-56" />
            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
              <SkeletonCard className="h-24" />
              <SkeletonCard className="h-24" />
              <SkeletonCard className="h-24" />
            </div>
          </div>
          <SkeletonCard className="h-96 lg:col-span-2" />
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SkeletonCard className="h-[420px]" />
          <SkeletonCard className="h-[420px]" />
        </section>

        <SkeletonCard className="h-64" />
      </div>
    </main>
  );
}

function SkeletonCard({ className }: { className: string }) {
  return (
    <div
      className={`rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 ${className}`}
    >
      <Logo size="sm" />
      <div className="mt-6 space-y-3">
        <div className="h-3 w-1/3 animate-pulse rounded bg-[var(--color-surface)]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--color-surface)]" />
      </div>
    </div>
  );
}
