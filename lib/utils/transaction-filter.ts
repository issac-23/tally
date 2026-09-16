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
  category?: { id: string; name: string } | null;
}

export interface TransactionFilter {
  /** Free text, matched against merchant, note and category. */
  query: string;
}

export const EMPTY_FILTER: TransactionFilter = { query: "" };

export function filterTransactions<T extends FilterableTransaction>(
  transactions: T[],
  filter: TransactionFilter
): T[] {
  const query = filter.query.trim().toLowerCase();
  if (query === "") return transactions;

  return transactions.filter((t) =>
    haystack(t).includes(query)
  );
}

function haystack(t: FilterableTransaction): string {
  // The category is on screen next to the merchant, so people type it
  // expecting it to work. "groceries" should find the groceries.
  return [t.merchant ?? "", t.description ?? "", t.category?.name ?? ""]
    .join(" ")
    .toLowerCase();
}
