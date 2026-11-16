/*
 * Admin authentication for the Edge Functions: constant-time check of the
 * X-Admin-Password header against MDPC_ADMIN_PASSWORD.
 * Used by createHandler (requireAdmin) and by handlers that check the password conditionally.
 */
import { ADMIN_PASSWORD_HEADER } from "../../../shared/constants/http.ts"
import { POST_ERROR_CODES } from "../../../shared/contracts/postErrorCodes.ts"
import type { FunctionConfig } from "./config.ts"
import { appError } from "./errors.ts"

async function sha256(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))

  return new Uint8Array(digest)
}

/**
 * Compares two strings in constant time. Both are hashed with SHA-256 and the
 * digests are compared without early exit, so the timing does not depend on
 * how much of the value matches or on its length.
 *
 * @param a - First string.
 * @param b - Second string.
 * @returns `true` when both strings are identical.
 */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [digestA, digestB] = await Promise.all([sha256(a), sha256(b)])

  let diff = 0

  for (let i = 0; i < digestA.length; i++) {
    diff |= digestA[i] ^ digestB[i]
  }

  return diff === 0
}

/**
 * Checks the X-Admin-Password header against the configured admin password.
 *
 * @param req - Incoming request.
 * @param config - Function configuration holding the expected password.
 * @throws {AppError} `MISSING_PASSWORD` (401) when the header is absent, or
 *   `WRONG_PASSWORD` (401) when it does not match.
 */
export async function assertAdminPassword(req: Request, config: FunctionConfig): Promise<void> {
  const provided = req.headers.get(ADMIN_PASSWORD_HEADER)

  if (!provided) {
    throw appError(POST_ERROR_CODES.MISSING_PASSWORD)
  }

  if (!(await safeEqual(provided, config.adminPassword))) {
    throw appError(POST_ERROR_CODES.WRONG_PASSWORD)
  }
}
