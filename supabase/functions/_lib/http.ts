import { POST_ERROR_CODES } from "../../../shared/contracts/postErrorCodes.ts"
import type { PostErrorCode } from "../../../shared/contracts/postErrorCodes.ts"
import { ConfigError, getConfig } from "./config.ts"
import type { FunctionConfig } from "./config.ts"
import { getCorsHeaders, getJsonHeaders, isOriginAllowed } from "./cors.ts"

const BASE_HEADERS = { "Content-Type": "application/json" }

export function errorResponse(
  code: PostErrorCode,
  status: number,
  headers: HeadersInit,
  details?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify(details ? { error: code, details } : { error: code }),
    { status, headers }
  )
}

export type RequestContext = {
  config: FunctionConfig
  jsonHeaders: Record<string, string>
}

// Common start of every handler: loads the config (500 SERVER_MISCONFIGURED),
// rejects disallowed origins on every method (403) and answers preflights.
// Returns a Response to send right away, or the context to keep handling.
export function prepareRequest(req: Request): Response | RequestContext {
  let config: FunctionConfig

  try {
    config = getConfig()
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`[config] ${error.message}`)
      return errorResponse(POST_ERROR_CODES.SERVER_MISCONFIGURED, 500, BASE_HEADERS)
    }

    throw error
  }

  const origin = req.headers.get("origin")

  if (!isOriginAllowed(origin, config)) {
    return errorResponse(POST_ERROR_CODES.FORBIDDEN_ORIGIN, 403, getJsonHeaders(null, config))
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders(origin, config) })
  }

  return { config, jsonHeaders: getJsonHeaders(origin, config) }
}

export function internalErrorResponse(error: unknown, headers: HeadersInit): Response {
  console.error("Unhandled error", error)

  return errorResponse(POST_ERROR_CODES.INTERNAL_ERROR, 500, headers)
}
