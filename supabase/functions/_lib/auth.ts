import { ADMIN_PASSWORD_HEADER } from "../../../shared/constants/http.ts"
import { POST_ERROR_CODES } from "../../../shared/contracts/postErrorCodes.ts"
import type { FunctionConfig } from "./config.ts"
import { appError } from "./errors.ts"

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

// Throws a 401 AppError when the X-Admin-Password header is missing or wrong.
export async function assertAdminPassword(req: Request, config: FunctionConfig): Promise<void> {
  const provided = req.headers.get(ADMIN_PASSWORD_HEADER)

  if (!provided) {
    throw appError(POST_ERROR_CODES.MISSING_PASSWORD)
  }

  if (!(await safeEqual(provided, config.adminPassword))) {
    throw appError(POST_ERROR_CODES.WRONG_PASSWORD)
  }
}
