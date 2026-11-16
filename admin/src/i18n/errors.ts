/*
 * Maps backend and client error codes to translated messages. Used wherever an
 * ApiError or a failed service result is shown to the user.
 */
import { POST_ERROR_CODES, type PostErrorCode } from "@mdpc/shared/contracts/postErrorCodes.ts";
import { ApiError, parseErrorBody, type ApiErrorDetails } from "../lib/apiError";
import type { MessageKey, Translate } from "./index";

// One entry per backend error code, so adding a code forces adding a message.
const ERROR_KEYS: Record<PostErrorCode, MessageKey> = {
  METHOD_NOT_ALLOWED: "error.METHOD_NOT_ALLOWED",
  FORBIDDEN_ORIGIN: "error.FORBIDDEN_ORIGIN",
  SERVER_MISCONFIGURED: "error.SERVER_MISCONFIGURED",
  INTERNAL_ERROR: "error.INTERNAL_ERROR",
  INVALID_FORM_DATA: "error.INVALID_FORM_DATA",
  INVALID_JSON: "error.INVALID_JSON",
  INVALID_ID: "error.INVALID_ID",
  MISSING_PASSWORD: "error.MISSING_PASSWORD",
  WRONG_PASSWORD: "error.WRONG_PASSWORD",
  POST_NOT_FOUND: "error.POST_NOT_FOUND",
  INVALID_TITLE: "error.INVALID_TITLE",
  DUPLICATE_IMAGE_NAME: "error.DUPLICATE_IMAGE_NAME",
  TITLE_OR_SLUG_ALREADY_EXISTS: "error.TITLE_OR_SLUG_ALREADY_EXISTS",
  INVALID_EXTENSION: "error.INVALID_EXTENSION",
  INVALID_IMAGE_TYPE: "error.INVALID_IMAGE_TYPE",
  IMAGE_TOO_LARGE: "error.IMAGE_TOO_LARGE",
  UUID_COLLISION: "error.UUID_COLLISION",
  TRANSIENT_ERROR_RETRY_FAILED: "error.TRANSIENT_ERROR_RETRY_FAILED",
  INVALID_ACTION: "error.INVALID_ACTION",
  INVALID_PATH: "error.INVALID_PATH",
  INVALID_NAME: "error.INVALID_NAME",
  MISSING_FILE: "error.MISSING_FILE",
  TEMP_IMAGE_NOT_FOUND: "error.TEMP_IMAGE_NOT_FOUND",
  TEMP_IMAGE_ALREADY_EXISTS: "error.TEMP_IMAGE_ALREADY_EXISTS",
  POST_IMAGE_NOT_FOUND: "error.POST_IMAGE_NOT_FOUND"
};

// Codes produced on the client side (network failures, malformed responses).
const CLIENT_ERROR_KEYS: Record<string, MessageKey> = {
  NETWORK_ERROR: "error.NETWORK_ERROR",
  INVALID_RESPONSE: "error.INVALID_RESPONSE"
};

function isPostErrorCode(code: string): code is PostErrorCode {
  return Object.hasOwn(POST_ERROR_CODES, code);
}

function toParam(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return value === undefined || value === null ? "" : String(value);
}

/**
 * Translated message for a backend error code and its optional details.
 *
 * @param t - Translate function.
 * @param code - Backend or client-side error code.
 * @param details - Values for the message placeholders (arrays are joined with ", ").
 * @returns The message, or the generic unknown-error message with the code.
 */
export function translateErrorCode(t: Translate, code: string, details?: ApiErrorDetails): string {
  const key = isPostErrorCode(code)
    ? ERROR_KEYS[code]
    : Object.hasOwn(CLIENT_ERROR_KEYS, code)
      ? CLIENT_ERROR_KEYS[code]
      : undefined;

  if (!key) {
    return t("error.UNKNOWN", { code });
  }

  const params: Record<string, string> = {};

  for (const [name, value] of Object.entries(details ?? {})) {
    params[name] = toParam(value);
  }

  return t(key, params);
}

/**
 * Message for any thrown value: an ApiError is translated, anything else is generic.
 *
 * @param t - Translate function.
 * @param error - Thrown value.
 * @returns The message.
 */
export function describeError(t: Translate, error: unknown): string {
  if (error instanceof ApiError) {
    return translateErrorCode(t, error.code, error.details);
  }

  return t("error.generic");
}

/**
 * Translated message of a failed `handleRequest` result (status 0 = network failure), or null.
 *
 * @param t - Translate function.
 * @param status - HTTP status, 0 for a network failure.
 * @param data - Parsed response body.
 * @returns The message, or `null` when the body carries no error code.
 */
export function describeServiceFailure(t: Translate, status: number, data: unknown): string | null {
  if (status === 0) {
    return translateErrorCode(t, "NETWORK_ERROR");
  }

  const { code, details } = parseErrorBody(data);

  return code ? translateErrorCode(t, code, details) : null;
}

/**
 * Translated message of a failed posts-client result.
 *
 * @param t - Translate function.
 * @param failure - The `error` code and `details` of the result.
 * @returns The message.
 */
export function describeClientFailure(
  t: Translate,
  failure: { error: string; details?: ApiErrorDetails }
): string {
  return translateErrorCode(t, failure.error, failure.details);
}
