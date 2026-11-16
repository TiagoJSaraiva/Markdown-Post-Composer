/*
 * Error model shared by all handlers: AppError, the HTTP status of every error
 * code and factories for the image errors. Thrown by helpers, mapped by http.ts.
 */
import { POST_ERROR_CODES } from "../../../shared/contracts/postErrorCodes.ts"
import type { PostErrorCode } from "../../../shared/contracts/postErrorCodes.ts"
import { ACCEPTED_EXTENSIONS, MAX_IMAGE_MB } from "../../../shared/constants/images.ts"

/** HTTP status of every error code, so a thrown AppError needs only its code. */
export const ERROR_STATUS: Record<PostErrorCode, number> = {
  METHOD_NOT_ALLOWED: 405,
  FORBIDDEN_ORIGIN: 403,
  SERVER_MISCONFIGURED: 500,
  INTERNAL_ERROR: 500,
  INVALID_FORM_DATA: 400,
  INVALID_JSON: 400,
  INVALID_ID: 400,
  MISSING_PASSWORD: 401,
  WRONG_PASSWORD: 401,
  POST_NOT_FOUND: 404,
  INVALID_TITLE: 400,
  MISSING_IMAGES: 400,
  DUPLICATE_IMAGE_NAME: 400,
  TITLE_OR_SLUG_ALREADY_EXISTS: 409,
  INVALID_EXTENSION: 400,
  INVALID_IMAGE_TYPE: 400,
  IMAGE_TOO_LARGE: 400,
  UUID_COLLISION: 500,
  TRANSIENT_ERROR_RETRY_FAILED: 503,
  INVALID_ACTION: 400,
  INVALID_PATH: 400,
  INVALID_NAME: 400,
  MISSING_FILE: 400,
  TEMP_IMAGE_NOT_FOUND: 404,
  TEMP_IMAGE_ALREADY_EXISTS: 409,
  POST_IMAGE_NOT_FOUND: 404
}

/**
 * An expected failure that maps straight to a coded JSON error response.
 * Helpers throw it; createHandler (http.ts) turns it into the response.
 */
export class AppError extends Error {
  /** Error code sent to the client as `{ error }`. */
  readonly code: PostErrorCode
  /** HTTP status of the response. */
  readonly status: number
  /** Extra data sent to the client as `{ details }`. */
  readonly details?: Record<string, unknown>

  /**
   * @param code - Error code sent to the client.
   * @param status - HTTP status of the response.
   * @param details - Optional extra data for the client.
   */
  constructor(code: PostErrorCode, status: number, details?: Record<string, unknown>) {
    super(code)
    this.name = "AppError"
    this.code = code
    this.status = status
    this.details = details
  }
}

/**
 * Creates an AppError whose status comes from ERROR_STATUS.
 *
 * @param code - Error code.
 * @param details - Optional extra data for the client.
 * @returns The error, ready to be thrown.
 */
export function appError(code: PostErrorCode, details?: Record<string, unknown>): AppError {
  return new AppError(code, ERROR_STATUS[code], details)
}

/**
 * Builds the INVALID_IMAGE_TYPE error, listing the accepted extensions.
 *
 * @param fileName - Name of the rejected file.
 * @returns The error, ready to be thrown.
 */
export function invalidImageType(fileName: string): AppError {
  return appError(POST_ERROR_CODES.INVALID_IMAGE_TYPE, {
    file: fileName,
    acceptedExtensions: ACCEPTED_EXTENSIONS
  })
}

/**
 * Builds the IMAGE_TOO_LARGE error, carrying the size limit in MB.
 *
 * @param fileName - Name of the rejected file.
 * @returns The error, ready to be thrown.
 */
export function imageTooLarge(fileName: string): AppError {
  return appError(POST_ERROR_CODES.IMAGE_TOO_LARGE, {
    file: fileName,
    maxMb: MAX_IMAGE_MB
  })
}
