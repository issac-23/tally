import { MAX_CATEGORY_NAME_LENGTH, textLength } from "./limits";

const MIN_NAME_LENGTH = 2;

export interface CategoryFields {
  name: string;
  color: string;
}

export type CategoryValidation =
  | { ok: true; fields: CategoryFields }
  | { ok: false; error: string };

/**
 * Checked here as well as by the CHECK constraint on categories.name, so a
 * bad value comes back as a readable message instead of a Postgres error.
 * The database's own ceiling (50) is looser than this on purpose, so the form
 * can tighten without a migration.
 */
export function validateCategoryInput(
  name: string,
  color: string
): CategoryValidation {
  const trimmed = name.trim();

  if (trimmed.length < MIN_NAME_LENGTH) {
    return { ok: false, error: `Category name must be at least ${MIN_NAME_LENGTH} characters.` };
  }
  if (textLength(trimmed) > MAX_CATEGORY_NAME_LENGTH) {
    return {
      ok: false,
      error: `Category name must be ${MAX_CATEGORY_NAME_LENGTH} characters or fewer.`,
    };
  }
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return { ok: false, error: "Choose a valid category color." };
  }
  return { ok: true, fields: { name: trimmed, color } };
}
