import { POST_ERROR_CODES } from "../../../shared/contracts/postErrorCodes.ts"
import type { PostErrorCode } from "../../../shared/contracts/postErrorCodes.ts"
import { assertAdminPassword } from "./auth.ts"
import { ConfigError, getConfig } from "./config.ts"
import type { FunctionConfig } from "./config.ts"
import { getCorsHeaders, getJsonHeaders, isOriginAllowed } from "./cors.ts"
import { AppError, appError } from "./errors.ts"

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

export function jsonResponse(payload: unknown, headers: HeadersInit, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers })
}

export function internalErrorResponse(error: unknown, headers: HeadersInit): Response {
  console.error("Unhandled error", error)

  return errorResponse(POST_ERROR_CODES.INTERNAL_ERROR, 500, headers)
}

// The single place where thrown errors become responses: AppError -> its coded
// response, ConfigError -> 500 SERVER_MISCONFIGURED, anything else -> 500.
export function toErrorResponse(error: unknown, headers: HeadersInit): Response {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.status, headers, error.details)
  }

  if (error instanceof ConfigError) {
    console.error(`[config] ${error.message}`)

    return errorResponse(POST_ERROR_CODES.SERVER_MISCONFIGURED, 500, headers)
  }

  return internalErrorResponse(error, headers)
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
    return toErrorResponse(error, BASE_HEADERS)
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

export type HandlerContext = RequestContext & {
  req: Request
}

export type HandlerOptions = {
  // Allowed HTTP methods (OPTIONS preflights are answered before this check).
  methods: readonly string[]
  // Require a valid X-Admin-Password. Leave false to check it later (or never).
  requireAdmin?: boolean
}

// Wraps a function body with the steps every handler shares, in order: config,
// origin/preflight, method check, optional password check. Anything the body
// throws is mapped by toErrorResponse.
export function createHandler(
  options: HandlerOptions,
  handle: (context: HandlerContext) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req) => {
    const prepared = prepareRequest(req)

    if (prepared instanceof Response) {
      return prepared
    }

    try {
      if (!options.methods.includes(req.method)) {
        throw appError(POST_ERROR_CODES.METHOD_NOT_ALLOWED)
      }

      if (options.requireAdmin) {
        await assertAdminPassword(req, prepared.config)
      }

      return await handle({ req, ...prepared })
    } catch (error) {
      return toErrorResponse(error, prepared.jsonHeaders)
    }
  }
}

export async function readJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    throw appError(POST_ERROR_CODES.INVALID_JSON)
  }
}

export async function readFormData(req: Request): Promise<FormData> {
  try {
    return await req.formData()
  } catch {
    throw appError(POST_ERROR_CODES.INVALID_FORM_DATA)
  }
}
