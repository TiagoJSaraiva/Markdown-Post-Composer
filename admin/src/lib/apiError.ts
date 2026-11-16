export type ApiErrorDetails = Record<string, unknown>;

/** Failure of a call to the backend: HTTP status plus the coded `error` of the response. */
export class ApiError extends Error {
  status: number;
  code: string;
  details?: ApiErrorDetails;

  constructor(status: number, code: string, details?: ApiErrorDetails) {
    super(code);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isUnauthorizedStatus(status: number): boolean {
  return status === 401;
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && isUnauthorizedStatus(error.status);
}
