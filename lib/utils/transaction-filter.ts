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
}

export interface TransactionFilter {
  /** Free text, matched against merchant and note. */
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
  return [t.merchant ?? "", t.description ?? ""].join(" ").toLowerCase();
}
