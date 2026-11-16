import type { FunctionConfig } from "./config.ts"

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

// Requests without an Origin header (server-to-server, scripts) are allowed.
// A present Origin must exactly match one of the configured origins.
export function isOriginAllowed(origin: string | null, config: FunctionConfig): boolean {
  if (origin === null) {
    return true
  }

  return resolveAllowedOrigin(origin, config.allowedOrigins) !== null
}

export function getCorsHeaders(origin: string | null, config: FunctionConfig): Record<string, string> {
  const allowedOrigin = resolveAllowedOrigin(origin, config.allowedOrigins)

  return {
    ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-password",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Vary": "Origin"
  }
}

export function getJsonHeaders(origin: string | null, config: FunctionConfig): Record<string, string> {
  return {
    ...getCorsHeaders(origin, config),
    "Content-Type": "application/json"
  }
}
