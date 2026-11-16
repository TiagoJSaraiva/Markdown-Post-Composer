import { ADMIN_PASSWORD_HEADER } from "../../../shared/constants/http.ts"
import { POST_ERROR_CODES } from "../../../shared/contracts/postErrorCodes.ts"
import type { FunctionConfig } from "./config.ts"
import { errorResponse } from "./http.ts"

async function sha256(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))

  return new Uint8Array(digest)
}

// Compares SHA-256 digests byte by byte without early exit, so the timing
// does not depend on how much of the password matches or on its length.
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [digestA, digestB] = await Promise.all([sha256(a), sha256(b)])

  let diff = 0

  for (let i = 0; i < digestA.length; i++) {
    diff |= digestA[i] ^ digestB[i]
  }

  return diff === 0
}

// Returns an error Response (401) when the X-Admin-Password header is missing
// or wrong, or null when the request is authenticated.
export async function checkAdminPassword(
  req: Request,
  config: FunctionConfig,
  headers: HeadersInit
): Promise<Response | null> {
  const provided = req.headers.get(ADMIN_PASSWORD_HEADER)

  if (!provided) {
    return errorResponse(POST_ERROR_CODES.MISSING_PASSWORD, 401, headers)
  }

  if (!(await safeEqual(provided, config.adminPassword))) {
    return errorResponse(POST_ERROR_CODES.WRONG_PASSWORD, 401, headers)
  }

  return null
}
