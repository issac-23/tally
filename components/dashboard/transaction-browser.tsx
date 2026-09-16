"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
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
 * The whole history is already on the page, so narrowing it is a client
 * concern — no round trip, and it stays responsive while typing.
 */
export function TransactionBrowser({ transactions }: TransactionBrowserProps) {
  const [filter, setFilter] = useState<TransactionFilter>(EMPTY_FILTER);

  const visible = useMemo(
    () => filterTransactions(transactions, filter),
    [transactions, filter]
  );

  return (
    <div className="space-y-6">
      <div className="relative">
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
