import { POST_ERROR_CODES } from "../../../shared/contracts/postErrorCodes.ts"
import { appError } from "./errors.ts"

// Lower-case, accent-free, dash-separated slug: "Promoção Nova!" -> "promocao-nova".
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

// Throws INVALID_TITLE when the title leaves nothing to build a slug from.
export function requireSlug(title: string): string {
  const slug = slugify(title)

  if (!slug) {
    throw appError(POST_ERROR_CODES.INVALID_TITLE)
  }

  return slug
}
