/*
 * Lazily created service-role Supabase client shared by the repository and
 * storage helpers of the Edge Functions.
 */
import { createClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"
import { ConfigError } from "./config.ts"

let client: SupabaseClient | null = null

function requireEnv(name: string): string {
  const value = Deno.env.get(name)?.trim()

  if (!value) {
    throw new ConfigError(name, "required environment variable is missing or empty")
  }

  return value
}

/**
 * Returns the service-role client, created on first use.
 *
 * @returns The shared Supabase client.
 * @throws {ConfigError} When SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is
 *   missing; handlers answer it as 500 SERVER_MISCONFIGURED.
 */
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"))
  }

  return client
}
