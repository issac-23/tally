"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { SignOutButton } from "@/components/ui/sign-out-button";
import { NavTabs } from "@/components/dashboard/nav-tabs";
import { isActiveRoute } from "@/lib/utils/nav";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/settings", label: "Settings" },
] as const;

export function TopNav() {
  const pathname = usePathname();
  const activeHref =
    navItems.find((item) => isActiveRoute(pathname, item.href))?.href ?? null;

  return (
    <header className="sticky top-0 z-30 bg-[var(--color-background)]/85 backdrop-blur border-b border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Row 1: identity + account. On sm+ the nav joins this row. */}
        <div className="h-14 flex items-center justify-between gap-3 sm:gap-6">
          <Link href="/dashboard" className="shrink-0">
            <Logo size="md" withWordmark />
          </Link>

          <nav aria-label="Main" className="hidden sm:block">
            <NavTabs items={navItems} activeHref={activeHref} />
          </nav>

          <div className="shrink-0">
            <SignOutButton />
          </div>
        </div>

        {/* Row 2 (mobile only): the three destinations share the width evenly
            so none of them can be clipped off-screen the way a single
            scrolling row clipped "Settings" at 390px. */}
        <nav aria-label="Main" className="pb-2 sm:hidden">
          <NavTabs items={navItems} activeHref={activeHref} stretch />
        </nav>
      </div>
    </header>
  );
}
