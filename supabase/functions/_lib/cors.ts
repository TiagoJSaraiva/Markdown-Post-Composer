/*
 * CORS helpers: allow-list matching against MDPC_ALLOWED_ORIGINS and the
 * response headers built from it. Used by http.ts (prepareRequest/createHandler).
 */
import type { FunctionConfig } from "./config.ts"

/**
 * Normalizes an Origin header value and checks it against the allow-list.
 *
 * @param origin - Raw Origin header value, or `null` when absent.
 * @param allowedOrigins - Normalized allowed origins.
 * @returns The normalized origin when allowed, otherwise `null`.
 */
export function resolveAllowedOrigin(origin: string | null, allowedOrigins: string[]): string | null {
  if (!origin) {
    return null
  }

  try {
    const normalized = new URL(origin).origin

    return allowedOrigins.includes(normalized) ? normalized : null
  } catch {
    return null
  }
}

/**
 * Decides whether a request may proceed. Requests without an Origin header
 * (server-to-server, scripts) are allowed; a present Origin must exactly match
 * one of the configured origins.
 *
 * @param origin - Raw Origin header value, or `null` when absent.
 * @param config - Function configuration holding the allow-list.
 * @returns `true` when the request is allowed.
 */
export function isOriginAllowed(origin: string | null, config: FunctionConfig): boolean {
  if (origin === null) {
    return true
  }

  return resolveAllowedOrigin(origin, config.allowedOrigins) !== null
}

/**
 * Builds the CORS response headers. `Access-Control-Allow-Origin` is sent only
 * for allowed origins; `Vary: Origin` is always sent.
 *
 * @param origin - Raw Origin header value, or `null` when absent.
 * @param config - Function configuration holding the allow-list.
 * @returns The CORS headers.
 */
export function getCorsHeaders(origin: string | null, config: FunctionConfig): Record<string, string> {
  const allowedOrigin = resolveAllowedOrigin(origin, config.allowedOrigins)

  return {
    ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-password",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Vary": "Origin"
  }
}

/**
 * CORS headers plus `Content-Type: application/json`.
 *
 * @param origin - Raw Origin header value, or `null` when absent.
 * @param config - Function configuration holding the allow-list.
 * @returns The headers for a JSON response.
 */
export function getJsonHeaders(origin: string | null, config: FunctionConfig): Record<string, string> {
  return {
    ...getCorsHeaders(origin, config),
    "Content-Type": "application/json"
  }
}
