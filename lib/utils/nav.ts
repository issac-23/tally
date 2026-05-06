/**
 * Decide whether a nav link is "active" given the current pathname.
 *
 * Rules:
 *   - Exact match is always active (e.g. /dashboard === /dashboard).
 *   - Nested routes match by prefix, but only at a path boundary
 *     (so /transactions matches /transactions/new but NOT /transactionsplus).
 *   - The root href "/" only matches exactly to avoid lighting up on every page.
 */
export function isActiveRoute(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/") return false;
  return pathname.startsWith(href + "/");
}
