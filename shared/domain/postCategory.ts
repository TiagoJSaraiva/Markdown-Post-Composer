/*
 * Post category rules: name format, list parsing and normalization.
 * Used by the Edge Functions config/form parsing and by clients.
 */
/** A category name; the allowed set is configured with MDPC_POST_CATEGORIES. */
export type PostCategory = string
/** A category as received from a client, before normalization. */
export type PostCategoryInput = string

/** Categories used when none is configured. */
export const DEFAULT_POST_CATEGORIES: readonly PostCategory[] = ["BLOG"]

const CATEGORY_PATTERN = /^[A-Z0-9_-]+$/

/**
 * Checks the category name format (A-Z, 0-9, `_` and `-`).
 *
 * @param value - Candidate name, already upper-cased.
 * @returns `true` when the format is valid.
 */
export function isValidCategoryName(value: string): boolean {
  return CATEGORY_PATTERN.test(value)
}

/**
 * Splits a comma-separated list, trims, upper-cases and removes empty entries
 * and duplicates. Entries are NOT validated (see isValidCategoryName).
 *
 * @param raw - Comma-separated list, e.g. an environment variable.
 * @returns The normalized names.
 */
export function splitCategoryList(raw: string | null | undefined): PostCategory[] {
  if (!raw) {
    return []
  }

  const result: PostCategory[] = []

  for (const part of raw.split(",")) {
    const normalized = part.trim().toUpperCase()

    if (normalized && !result.includes(normalized)) {
      result.push(normalized)
    }
  }

  return result
}

/**
 * Parses a comma-separated category list, ignoring invalid entries.
 *
 * @param raw - Comma-separated list, e.g. an environment variable.
 * @param fallback - Returned when the list is empty or has no valid entry.
 * @returns The valid categories, or a copy of `fallback`.
 * @example
 * parseCategoryList("blog, news, bad name") // ["BLOG", "NEWS"]
 * parseCategoryList("") // ["BLOG"]
 */
export function parseCategoryList(
  raw: string | null | undefined,
  fallback: readonly PostCategory[] = DEFAULT_POST_CATEGORIES
): PostCategory[] {
  const parsed = splitCategoryList(raw).filter(isValidCategoryName)

  return parsed.length > 0 ? parsed : [...fallback]
}

/**
 * Checks that a category belongs to the allowed set (exact match).
 *
 * @param value - Category to check.
 * @param allowed - Allowed categories.
 * @returns `true` when `value` is allowed.
 */
export function isPostCategory(value: string, allowed: readonly PostCategory[]): boolean {
  return allowed.includes(value)
}

/**
 * Trims and upper-cases a category and checks it against the allowed set.
 *
 * @param rawCategory - Category as received from a client.
 * @param allowed - Allowed categories.
 * @returns The normalized category, or `null` when it is not allowed.
 */
export function normalizePostCategory(
  rawCategory: string,
  allowed: readonly PostCategory[]
): PostCategory | null {
  const normalized = rawCategory.trim().toUpperCase()

  return isPostCategory(normalized, allowed) ? normalized : null
}
