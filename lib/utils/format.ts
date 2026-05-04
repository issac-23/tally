/**
 * Format a number as USD. Defaults to no cents for amounts ≥ $100
 * since cents become noise on summaries; show cents on smaller amounts.
 */
export function formatCurrency(
  amount: number,
  options: { showCents?: boolean } = {}
): string {
  const showCents = options.showCents ?? amount < 100;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(amount);
}

/**
 * Format an amount compactly for chart labels and small spaces.
 * 1234 -> "$1.2k", 1234567 -> "$1.2M"
 */
export function formatCurrencyCompact(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}
