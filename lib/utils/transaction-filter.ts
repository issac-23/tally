/**
 * Narrowing a transaction list.
 *
 * The list grows forever and is grouped by month, so finding "that Uniqlo
 * thing in June" means scrolling past everything since. This filters the
 * rows already on the page — no extra queries, no schema.
 */

interface FilterableTransaction {
  description?: string | null;
  merchant?: string | null;
  recurrence?: string | null;
  category?: { id: string; name: string } | null;
}

export interface TransactionFilter {
  /** Free text, matched against merchant, note and category. */
  query: string;
  /** A category id, or "" for every category. */
  categoryId: string;
  /** Show only standing commitments. */
  recurringOnly: boolean;
}

export const EMPTY_FILTER: TransactionFilter = {
  query: "",
  categoryId: "",
  recurringOnly: false,
};

export function filterTransactions<T extends FilterableTransaction>(
  transactions: T[],
  filter: TransactionFilter
): T[] {
  const query = filter.query.trim().toLowerCase();

  return transactions.filter((t) => {
    // Anything without a recurrence, or explicitly "once", is a one-off.
    if (filter.recurringOnly && (t.recurrence ?? "once") === "once") return false;
    if (filter.categoryId && t.category?.id !== filter.categoryId) return false;
    if (query && !haystack(t).includes(query)) return false;
    return true;
  });
}

/**
 * Whether the user has narrowed anything.
 *
 * "No transactions yet" and "nothing matched your search" are different
 * problems with different fixes, and the list can't tell them apart from
 * the row count alone.
 */
export function isFilterActive(filter: TransactionFilter): boolean {
  return (
    filter.query.trim() !== "" ||
    filter.categoryId !== "" ||
    filter.recurringOnly
  );
}

function haystack(t: FilterableTransaction): string {
  // The category is on screen next to the merchant, so people type it
  // expecting it to work. "groceries" should find the groceries.
  return [t.merchant ?? "", t.description ?? "", t.category?.name ?? ""]
    .join(" ")
    .toLowerCase();
}
