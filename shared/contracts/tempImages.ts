import type { ErrorResponse } from "./postErrorCodes.ts"
import { hasStringField, isObjectRecord } from "../utils/objectGuards.ts"

export type TempImage = {
  // display name: no version suffix, no extension
  name: string
  // object path inside the temp bucket
  path: string
  // public URL with the ?v=<token> cache buster
  publicUrl: string
}

// PATCH body
export type RenameTempImageRequestBody = {
  path: string
  name: string
}

// DELETE body: one image or the whole bucket
export type DeleteTempImagesRequestBody = { path: string } | { all: true }

// POST ?action=import body
export type ImportPostImageRequestBody = {
  postImagePath: string
}

export type ListTempImagesSuccessResponse = {
  success: true
  data: TempImage[]
}

// Used by upload, rename and import
export type TempImageSuccessResponse = {
  success: true
  data: TempImage
}

export type DeleteTempImagesSuccessResponse = {
  success: true
  data: { deleted: number }
}

export type TempImagesErrorResponse = ErrorResponse

export function isTempImage(value: unknown): value is TempImage {
  return (
    isObjectRecord(value) &&
    hasStringField(value, "name") &&
    hasStringField(value, "path") &&
    hasStringField(value, "publicUrl")
  )
}

export function isListTempImagesSuccessResponse(data: unknown): data is ListTempImagesSuccessResponse {
  if (!isObjectRecord(data) || data.success !== true || !Array.isArray(data.data)) {
    return false
  }

  return data.data.every(isTempImage)
}

export function isTempImageSuccessResponse(data: unknown): data is TempImageSuccessResponse {
  return isObjectRecord(data) && data.success === true && isTempImage(data.data)
}

export function isDeleteTempImagesSuccessResponse(data: unknown): data is DeleteTempImagesSuccessResponse {
  return (
    isObjectRecord(data) &&
    data.success === true &&
    isObjectRecord(data.data) &&
    typeof data.data.deleted === "number"
  )
}

export function isRenameTempImageRequestBody(value: unknown): value is RenameTempImageRequestBody {
  return isObjectRecord(value) && hasStringField(value, "path") && hasStringField(value, "name")
}

export function isDeleteTempImagesRequestBody(value: unknown): value is DeleteTempImagesRequestBody {
  if (!isObjectRecord(value)) {
    return false
  }

  return value.all === true || hasStringField(value, "path")
}

export function isImportPostImageRequestBody(value: unknown): value is ImportPostImageRequestBody {
  return isObjectRecord(value) && hasStringField(value, "postImagePath")
}
