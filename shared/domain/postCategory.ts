export type PostCategory = string
export type PostCategoryInput = string

export const DEFAULT_POST_CATEGORIES: readonly PostCategory[] = ["BLOG"]

const CATEGORY_PATTERN = /^[A-Z0-9_-]+$/

export function isValidCategoryName(value: string): boolean {
  return CATEGORY_PATTERN.test(value)
}

// Splits a comma-separated list, trims, upper-cases and removes empty entries
// and duplicates. Entries are NOT validated (see isValidCategoryName).
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

// Returns the valid categories of a comma-separated list, or `fallback`
// when the list is empty or has no valid entry.
export function parseCategoryList(
  raw: string | null | undefined,
  fallback: readonly PostCategory[] = DEFAULT_POST_CATEGORIES
): PostCategory[] {
  const parsed = splitCategoryList(raw).filter(isValidCategoryName)

  return parsed.length > 0 ? parsed : [...fallback]
}

export function isPostCategory(value: string, allowed: readonly PostCategory[]): boolean {
  return allowed.includes(value)
}

export function normalizePostCategory(
  rawCategory: string,
  allowed: readonly PostCategory[]
): PostCategory | null {
  const normalized = rawCategory.trim().toUpperCase()

  return isPostCategory(normalized, allowed) ? normalized : null
}
