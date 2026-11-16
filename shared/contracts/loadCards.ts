/*
 * Response contract of load_cards: types and runtime guards used by the SDK
 * and the admin.
 */
import type { PostCategoryInput } from "../domain/postCategory.ts"
import type { ErrorResponse } from "./postErrorCodes.ts"
import { isObjectRecord } from "../utils/objectGuards.ts"

/** A post as listed by load_cards (no content). */
export type PostCard = {
  id: string
  title: string
  slug: string
  preview: string
  /** The post category. */
  post_type: PostCategoryInput
  active: boolean
  /** Public URL of the banner. */
  banner_url: string
}

/** Success body of load_cards. */
export type LoadCardsSuccessResponse = {
  success: true
  data: PostCard[]
}

/** Error body of load_cards. */
export type LoadCardsErrorResponse = ErrorResponse

/** Any body of load_cards. */
export type LoadCardsResponse = LoadCardsSuccessResponse | LoadCardsErrorResponse

/**
 * Runtime guard for a PostCard.
 *
 * @param value - Value to check.
 * @returns `true` when `value` has every PostCard field with the right type.
 */
export function isPostCard(value: unknown): value is PostCard {
  if (!isObjectRecord(value)) {
    return false
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.slug === "string" &&
    typeof value.preview === "string" &&
    typeof value.post_type === "string" &&
    typeof value.active === "boolean" &&
    typeof value.banner_url === "string"
  )
}

/**
 * Runtime guard for the load_cards success body.
 *
 * @param data - Parsed response body.
 * @returns `true` when `data` is `{ success: true, data: PostCard[] }`.
 */
export function isLoadCardsSuccessResponse(data: unknown): data is LoadCardsSuccessResponse {
  if (!isObjectRecord(data) || data.success !== true || !Array.isArray(data.data)) {
    return false
  }

  return data.data.every(isPostCard)
}
