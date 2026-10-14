/**
 * Small checks the validators share, so an expense and an income source
 * agree on what a blank field or a real date is.
 */

/** Trimmed, with empty strings turned into null. */
export function blankToNull(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  // `new Date("2026-02-31")` rolls over to March rather than failing, so
  // compare the round trip instead of trusting the parse.
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}
