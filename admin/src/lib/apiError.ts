/*
 * Error type for failed backend calls and helpers to read coded error bodies and
 * detect 401 responses. Used by the services, hooks and the error translation.
 */
import { isObjectRecord } from "@mdpc/shared/utils/objectGuards.ts";

/** Extra data of a backend error (e.g. the file name of an image error). */
export type ApiErrorDetails = Record<string, unknown>;

/** Failure of a call to the backend: HTTP status plus the coded `error` of the response. */
export class ApiError extends Error {
  /** HTTP status; 0 for network failures. */
  status: number;
  /** Backend error code, or a client-side one (`NETWORK_ERROR`, `INVALID_RESPONSE`). */
  code: string;
  /** Optional data used to fill the message placeholders. */
  details?: ApiErrorDetails;

  constructor(status: number, code: string, details?: ApiErrorDetails) {
    super(code);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Tells whether an HTTP status means the admin password was rejected.
 *
 * @param status - HTTP status.
 * @returns `true` for 401.
 */
export function isUnauthorizedStatus(status: number): boolean {
  return status === 401;
}

/**
 * Tells whether a thrown value is a 401 ApiError.
 *
 * @param error - Any thrown value.
 * @returns `true` for an ApiError with status 401.
 */
export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && isUnauthorizedStatus(error.status);
}

/**
 * Reads the `error` code and `details` of a JSON error body; both are optional when the shape is unknown.
 *
 * @param body - Parsed response body.
 * @returns The code (non-empty string) and the details object, each `undefined` when absent.
 */
export function parseErrorBody(body: unknown): { code?: string; details?: ApiErrorDetails } {
  if (!isObjectRecord(body)) {
    return {};
  }

  const details =
    isObjectRecord(body.details) && !Array.isArray(body.details)
      ? (body.details as ApiErrorDetails)
      : undefined;

  return { code: typeof body.error === "string" && body.error ? body.error : undefined, details };
}
