"use client";

import { useMemo, useState } from "react";
import { Repeat, Search } from "lucide-react";
import {
  TransactionRow,
  type TransactionRowData,
} from "@/components/dashboard/transaction-row";
import { groupByMonth } from "@/lib/utils/aggregation";
import { formatCurrency } from "@/lib/utils/format";
import {
  EMPTY_FILTER,
  filterTransactions,
  type TransactionFilter,
} from "@/lib/utils/transaction-filter";

interface TransactionBrowserProps {
  transactions: TransactionRowData[];
}

/**
 * Only the categories actually used by these rows. Offering all twelve
 * would let you pick one and get nothing, which reads as a bug.
 */
function usedCategories(transactions: TransactionRowData[]) {
  const seen = new Map<string, { id: string; name: string }>();
  for (const t of transactions) {
    if (t.category && !seen.has(t.category.id)) {
      seen.set(t.category.id, { id: t.category.id, name: t.category.name });
    }
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The whole history is already on the page, so narrowing it is a client
 * concern — no round trip, and it stays responsive while typing.
 */
export function TransactionBrowser({ transactions }: TransactionBrowserProps) {
  const [filter, setFilter] = useState<TransactionFilter>(EMPTY_FILTER);

  const visible = useMemo(
    () => filterTransactions(transactions, filter),
    [transactions, filter]
  );
  const categories = useMemo(() => usedCategories(transactions), [transactions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-foreground-muted)]"
          aria-hidden
        />
        <input
          type="search"
          value={filter.query}
          onChange={(e) => setFilter({ ...filter, query: e.target.value })}
          placeholder="Search merchant, note or category…"
          aria-label="Search transactions"
          className="w-full rounded border border-[var(--color-border-strong)] bg-white py-2.5 pl-9 pr-3 text-[var(--color-foreground)] transition-all focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-subtle)]"
        />
      </div>

        <select
          value={filter.categoryId}
          onChange={(e) => setFilter({ ...filter, categoryId: e.target.value })}
          aria-label="Filter by category"
          className="rounded border border-[var(--color-border-strong)] bg-white px-3 py-2.5 text-sm text-[var(--color-foreground)] transition-all focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-subtle)] sm:w-48"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() =>
            setFilter({ ...filter, recurringOnly: !filter.recurringOnly })
          }
          aria-pressed={filter.recurringOnly}
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded border px-3 py-2.5 text-sm font-medium transition-colors ${
            filter.recurringOnly
              ? "border-[var(--color-brand)] bg-[var(--color-brand-subtle)] text-[var(--color-brand)]"
              : "border-[var(--color-border-strong)] bg-white text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface)]"
          }`}
        >
          <Repeat size={15} aria-hidden />
          Recurring
        </button>
      </div>

      <div className="space-y-6">
        {groupByMonth(visible).map((group) => (
          <section key={group.key} className="space-y-2">
            <div className="flex items-baseline justify-between gap-3 px-1">
              <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
                {group.label}
              </h2>
              <p className="text-sm tabular-nums text-[var(--color-foreground-muted)]">
                {formatCurrency(group.total)}
              </p>
            </div>
            <ul className="overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)]">
              {group.transactions.map((t, i) => (
                <li
                  key={t.id}
                  className={i > 0 ? "border-t border-[var(--color-border)]" : ""}
                >
                  <TransactionRow transaction={t} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
