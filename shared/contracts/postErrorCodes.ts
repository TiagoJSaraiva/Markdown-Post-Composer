/*
 * Error codes returned by the Edge Functions in `{ error }`. The HTTP status of
 * each code lives in supabase/functions/_lib/errors.ts; the admin maps them to messages.
 */
/** Every error code the Edge Functions can return in `{ error }`. */
export const POST_ERROR_CODES = {
  METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
  FORBIDDEN_ORIGIN: "FORBIDDEN_ORIGIN",
  SERVER_MISCONFIGURED: "SERVER_MISCONFIGURED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  INVALID_FORM_DATA: "INVALID_FORM_DATA",
  INVALID_JSON: "INVALID_JSON",
  INVALID_ID: "INVALID_ID",
  MISSING_PASSWORD: "MISSING_PASSWORD",
  WRONG_PASSWORD: "WRONG_PASSWORD",
  POST_NOT_FOUND: "POST_NOT_FOUND",
  INVALID_TITLE: "INVALID_TITLE",
  DUPLICATE_IMAGE_NAME: "DUPLICATE_IMAGE_NAME",
  TITLE_OR_SLUG_ALREADY_EXISTS: "TITLE_OR_SLUG_ALREADY_EXISTS",
  INVALID_EXTENSION: "INVALID_EXTENSION",
  INVALID_IMAGE_TYPE: "INVALID_IMAGE_TYPE",
  IMAGE_TOO_LARGE: "IMAGE_TOO_LARGE",
  UUID_COLLISION: "UUID_COLLISION",
  TRANSIENT_ERROR_RETRY_FAILED: "TRANSIENT_ERROR_RETRY_FAILED",
  // temp_images
  INVALID_ACTION: "INVALID_ACTION",
  INVALID_PATH: "INVALID_PATH",
  INVALID_NAME: "INVALID_NAME",
  MISSING_FILE: "MISSING_FILE",
  TEMP_IMAGE_NOT_FOUND: "TEMP_IMAGE_NOT_FOUND",
  TEMP_IMAGE_ALREADY_EXISTS: "TEMP_IMAGE_ALREADY_EXISTS",
  POST_IMAGE_NOT_FOUND: "POST_IMAGE_NOT_FOUND",
} as const

/** Union of the values of POST_ERROR_CODES. */
export type PostErrorCode = (typeof POST_ERROR_CODES)[keyof typeof POST_ERROR_CODES]

/** Error body returned by every Edge Function. */
export type ErrorResponse<TError extends string = PostErrorCode> = {
  error: TError
  /** Extra data about the error (e.g. the offending file name). */
  details?: Record<string, unknown>
}
