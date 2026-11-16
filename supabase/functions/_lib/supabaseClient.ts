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

// Service-role client, created on first use. A missing variable throws a
// ConfigError, which handlers answer as 500 SERVER_MISCONFIGURED.
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"))
  }

  return client
}
