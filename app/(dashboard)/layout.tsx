import { DemoBanner } from "@/components/dashboard/demo-banner";
import { TopNav } from "@/components/dashboard/top-nav";
import { resolveSession } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Memoised per request, so the page below shares this answer.
  const session = await resolveSession();
  const demo = session.kind === "demo";

  return (
    <>
      <TopNav demo={demo} />
      {demo && <DemoBanner />}
      {children}
    </>
  );
}
