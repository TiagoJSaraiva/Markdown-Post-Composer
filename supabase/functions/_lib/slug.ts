/*
 * Slug generation from post titles. Used by create_post and update_post.
 */
import { POST_ERROR_CODES } from "../../../shared/contracts/postErrorCodes.ts"
import { appError } from "./errors.ts"

/**
 * Builds a lower-case, accent-free, dash-separated slug.
 *
 * @param title - Post title.
 * @returns The slug, possibly empty when the title has no usable characters.
 * @example
 * slugify("Crème Brûlée Recipe!") // "creme-brulee-recipe"
 */
export function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Builds the slug of a title, requiring it to be non-empty.
 *
 * @param title - Post title.
 * @returns The slug.
 * @throws {AppError} `INVALID_TITLE` when the title leaves nothing to build a slug from.
 */
export function requireSlug(title: string): string {
  const slug = slugify(title)

  if (!slug) {
    throw appError(POST_ERROR_CODES.INVALID_TITLE)
  }

  return slug
}
