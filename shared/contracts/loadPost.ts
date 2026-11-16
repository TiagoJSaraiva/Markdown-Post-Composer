/*
 * Response contract of load_post: types and runtime guards used by the SDK
 * and the admin.
 */
import type { PostCategoryInput } from "../domain/postCategory.ts"
import type { ErrorResponse } from "./postErrorCodes.ts"
import { hasStringField, isObjectRecord, isStringArray } from "../utils/objectGuards.ts"

/** A full post as returned by load_post. */
export type PostDetails = {
  id: string
  /** The post category. */
  post_type: PostCategoryInput
  title: string
  preview: string
  active: boolean
  slug: string
  /** Storage path of the banner inside the posts bucket. */
  banner_path: string
  /** Public URL of the banner. */
  banner_url: string
  content_markdown: string
  /** Storage paths of the content images (the banner is excluded). */
  image_paths: string[]
}

/** Success body of load_post. */
export type LoadPostSuccessResponse = {
  success: true
  data: PostDetails
}

/** Error body of load_post. */
export type LoadPostErrorResponse = ErrorResponse

/** Any body of load_post. */
export type LoadPostResponse = LoadPostSuccessResponse | LoadPostErrorResponse

/**
 * Runtime guard for PostDetails.
 *
 * @param value - Value to check.
 * @returns `true` when `value` has every PostDetails field with the right type.
 */
export function isPostDetails(value: unknown): value is PostDetails {
  if (!isObjectRecord(value)) {
    return false
  }

  return (
    hasStringField(value, "id") &&
    hasStringField(value, "post_type") &&
    hasStringField(value, "title") &&
    hasStringField(value, "preview") &&
    typeof value.active === "boolean" &&
    hasStringField(value, "slug") &&
    hasStringField(value, "banner_path") &&
    hasStringField(value, "banner_url") &&
    hasStringField(value, "content_markdown") &&
    isStringArray(value.image_paths)
  )
}

/**
 * Runtime guard for the load_post success body.
 *
 * @param data - Parsed response body.
 * @returns `true` when `data` is `{ success: true, data: PostDetails }`.
 */
export function isLoadPostSuccessResponse(data: unknown): data is LoadPostSuccessResponse {
  return isObjectRecord(data) && data.success === true && isPostDetails(data.data)
}
