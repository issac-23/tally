"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { SignOutButton } from "@/components/ui/sign-out-button";
import { isActiveRoute } from "@/lib/utils/nav";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/settings", label: "Settings" },
] as const;

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 bg-[var(--color-background)]/85 backdrop-blur border-b border-[var(--color-border)]">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
        <Link href="/dashboard" className="shrink-0">
          <Logo size="md" withWordmark />
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const active = isActiveRoute(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--color-brand-subtle)] text-[var(--color-brand)]"
                    : "text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0">
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
