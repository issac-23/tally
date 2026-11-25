import { DemoBanner } from "@/components/dashboard/demo-banner";
import { TopNav } from "@/components/dashboard/top-nav";
import { TimeZoneSync } from "@/components/time-zone-sync";
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
      {/* Every signed-in and demo page sits under here, so the zone is
          reported once and is already there for the next request. */}
      <TimeZoneSync />
      <TopNav demo={demo} />
      {demo && <DemoBanner />}
      {children}
    </>
  );
}
