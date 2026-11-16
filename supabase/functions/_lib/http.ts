/*
 * HTTP plumbing shared by every handler: JSON/error responses, the common
 * request preamble (config, origin, preflight) and createHandler, the wrapper
 * each function's index.ts passes to Deno.serve.
 */
import { POST_ERROR_CODES } from "../../../shared/contracts/postErrorCodes.ts"
import type { PostErrorCode } from "../../../shared/contracts/postErrorCodes.ts"
import { assertAdminPassword } from "./auth.ts"
import { ConfigError, getConfig } from "./config.ts"
import type { FunctionConfig } from "./config.ts"
import { getCorsHeaders, getJsonHeaders, isOriginAllowed } from "./cors.ts"
import { AppError, appError } from "./errors.ts"

const BASE_HEADERS = { "Content-Type": "application/json" }

/**
 * Builds a coded JSON error response `{ error, details? }`.
 *
 * @param code - Error code.
 * @param status - HTTP status.
 * @param headers - Response headers.
 * @param details - Optional extra data.
 * @returns The response.
 */
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

/**
 * Serializes a payload as a JSON response body.
 *
 * @param payload - Value to serialize.
 * @param headers - Response headers (should include the JSON content type).
 * @param status - HTTP status (default 200).
 * @returns The response.
 */
export function jsonResponse(payload: unknown, headers: HeadersInit, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers })
}

/**
 * Logs an unexpected error and answers 500 INTERNAL_ERROR without leaking its message.
 *
 * @param error - The unexpected error.
 * @param headers - Response headers.
 * @returns The response.
 */
export function internalErrorResponse(error: unknown, headers: HeadersInit): Response {
  console.error("Unhandled error", error)

  return errorResponse(POST_ERROR_CODES.INTERNAL_ERROR, 500, headers)
}

/**
 * The single place where thrown errors become responses: AppError becomes its
 * coded response, ConfigError becomes 500 SERVER_MISCONFIGURED and anything
 * else becomes 500 INTERNAL_ERROR.
 *
 * @param error - The thrown value.
 * @param headers - Response headers.
 * @returns The response.
 */
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

/** What a handler needs once the common preamble has passed. */
export type RequestContext = {
  config: FunctionConfig
  /** CORS headers for the request origin plus the JSON content type. */
  jsonHeaders: Record<string, string>
}

/**
 * Common start of every handler: loads the config (500 SERVER_MISCONFIGURED),
 * rejects disallowed origins on every method (403) and answers preflights.
 *
 * @param req - Incoming request.
 * @returns A Response to send right away, or the context to keep handling.
 */
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

/** Argument received by the body passed to createHandler. */
export type HandlerContext = RequestContext & {
  req: Request
}

/** Options of createHandler. */
export type HandlerOptions = {
  /** Allowed HTTP methods (OPTIONS preflights are answered before this check). */
  methods: readonly string[]
  /** Require a valid X-Admin-Password. Leave false to check it later (or never). */
  requireAdmin?: boolean
}

/**
 * Wraps a function body with the steps every handler shares, in order: config,
 * origin/preflight, method check, optional password check. Anything the body
 * throws is mapped by toErrorResponse.
 *
 * @param options - Allowed methods and whether the admin password is required.
 * @param handle - The function body, called once all checks have passed.
 * @returns A request handler to pass to `Deno.serve`.
 * @example
 * Deno.serve(createHandler({ methods: ["GET"] }, ({ jsonHeaders }) =>
 *   Promise.resolve(jsonResponse({ success: true }, jsonHeaders))
 * ))
 */
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

/**
 * Parses the request body as JSON.
 *
 * @param req - Incoming request.
 * @returns The parsed, still unvalidated, value.
 * @throws {AppError} `INVALID_JSON` (400) when the body is not valid JSON.
 */
export async function readJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    throw appError(POST_ERROR_CODES.INVALID_JSON)
  }
}

/**
 * Parses the request body as multipart/form-data.
 *
 * @param req - Incoming request.
 * @returns The parsed form.
 * @throws {AppError} `INVALID_FORM_DATA` (400) when the body is not a valid form.
 */
export async function readFormData(req: Request): Promise<FormData> {
  try {
    return await req.formData()
  } catch {
    throw appError(POST_ERROR_CODES.INVALID_FORM_DATA)
  }
}
