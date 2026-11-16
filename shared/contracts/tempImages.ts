/*
 * Request/response contracts of the temp_images Edge Function, with runtime
 * guards used by the admin client.
 */
import type { ErrorResponse } from "./postErrorCodes.ts"
import { hasStringField, isObjectRecord } from "../utils/objectGuards.ts"

/** A temp image as returned by temp_images. */
export type TempImage = {
  /** Display name: no version suffix, no extension. */
  name: string
  /** Object path inside the temp bucket. */
  path: string
  /** Public URL with the ?v=<token> cache buster. */
  publicUrl: string
}

/** PATCH body: renames an image. */
export type RenameTempImageRequestBody = {
  /** Current object path. */
  path: string
  /** New display name (normalized by the function). */
  name: string
}

/** DELETE body: one image or the whole bucket. */
export type DeleteTempImagesRequestBody = { path: string } | { all: true }

/** POST ?action=import body: copies a post image into the temp bucket. */
export type ImportPostImageRequestBody = {
  /** Object path in the posts bucket, `<post-id>/<file>`. */
  postImagePath: string
}

/** Success body of GET temp_images. */
export type ListTempImagesSuccessResponse = {
  success: true
  data: TempImage[]
}

/** Success body of the upload, rename and import actions. */
export type TempImageSuccessResponse = {
  success: true
  data: TempImage
}

/** Success body of DELETE temp_images. */
export type DeleteTempImagesSuccessResponse = {
  success: true
  /** `deleted` is the number of removed objects. */
  data: { deleted: number }
}

/** Error body of temp_images. */
export type TempImagesErrorResponse = ErrorResponse

/**
 * Runtime guard for a TempImage.
 *
 * @param value - Value to check.
 * @returns `true` when `value` is a TempImage.
 */
export function isTempImage(value: unknown): value is TempImage {
  return (
    isObjectRecord(value) &&
    hasStringField(value, "name") &&
    hasStringField(value, "path") &&
    hasStringField(value, "publicUrl")
  )
}

/**
 * Runtime guard for the list success body.
 *
 * @param data - Parsed response body.
 * @returns `true` when `data` is `{ success: true, data: TempImage[] }`.
 */
export function isListTempImagesSuccessResponse(data: unknown): data is ListTempImagesSuccessResponse {
  if (!isObjectRecord(data) || data.success !== true || !Array.isArray(data.data)) {
    return false
  }

  return data.data.every(isTempImage)
}

/**
 * Runtime guard for the upload/rename/import success body.
 *
 * @param data - Parsed response body.
 * @returns `true` when `data` is `{ success: true, data: TempImage }`.
 */
export function isTempImageSuccessResponse(data: unknown): data is TempImageSuccessResponse {
  return isObjectRecord(data) && data.success === true && isTempImage(data.data)
}

/**
 * Runtime guard for the delete success body.
 *
 * @param data - Parsed response body.
 * @returns `true` when `data` is `{ success: true, data: { deleted: number } }`.
 */
export function isDeleteTempImagesSuccessResponse(data: unknown): data is DeleteTempImagesSuccessResponse {
  return (
    isObjectRecord(data) &&
    data.success === true &&
    isObjectRecord(data.data) &&
    typeof data.data.deleted === "number"
  )
}

/**
 * Runtime guard for the PATCH body.
 *
 * @param value - Parsed request body.
 * @returns `true` when `value` has string `path` and `name`.
 */
export function isRenameTempImageRequestBody(value: unknown): value is RenameTempImageRequestBody {
  return isObjectRecord(value) && hasStringField(value, "path") && hasStringField(value, "name")
}

/**
 * Runtime guard for the DELETE body.
 *
 * @param value - Parsed request body.
 * @returns `true` when `value` is `{ all: true }` or has a string `path`.
 */
export function isDeleteTempImagesRequestBody(value: unknown): value is DeleteTempImagesRequestBody {
  if (!isObjectRecord(value)) {
    return false
  }

  return value.all === true || hasStringField(value, "path")
}

/**
 * Runtime guard for the import body.
 *
 * @param value - Parsed request body.
 * @returns `true` when `value` has a string `postImagePath`.
 */
export function isImportPostImageRequestBody(value: unknown): value is ImportPostImageRequestBody {
  return isObjectRecord(value) && hasStringField(value, "postImagePath")
}
