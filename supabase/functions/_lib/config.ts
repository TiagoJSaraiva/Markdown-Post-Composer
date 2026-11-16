import {
  DEFAULT_POST_CATEGORIES,
  isValidCategoryName,
  splitCategoryList
} from "../../../shared/domain/postCategory.ts"
import { resolvePostImagesBucket, resolveTempBucket } from "../../../shared/constants/storage.ts"

export type FunctionConfig = {
  adminPassword: string
  allowedOrigins: string[]
  categories: string[]
  postsBucket: string
  tempBucket: string
}

export class ConfigError extends Error {
  variable: string

  constructor(variable: string, reason: string) {
    super(`${variable}: ${reason}`)
    this.name = "ConfigError"
    this.variable = variable
  }
}

let cachedConfig: FunctionConfig | null = null

function parseAllowedOrigins(raw: string | undefined): string[] {
  const origins: string[] = []

  for (const part of (raw ?? "").split(",")) {
    const value = part.trim()

    if (!value) continue

    let origin: string

    try {
      const parsed = new URL(value)

      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("unsupported protocol")
      }

      origin = parsed.origin
    } catch {
      throw new ConfigError(
        "MDPC_ALLOWED_ORIGINS",
        `invalid origin "${value}" (expected a full origin such as https://admin.example.com)`
      )
    }

    if (!origins.includes(origin)) {
      origins.push(origin)
    }
  }

  return origins
}

function parseCategories(raw: string | undefined): string[] {
  const categories = splitCategoryList(raw)

  for (const category of categories) {
    if (!isValidCategoryName(category)) {
      throw new ConfigError(
        "MDPC_POST_CATEGORIES",
        `invalid category "${category}" (allowed characters: A-Z, 0-9, _ and -)`
      )
    }
  }

  return categories.length > 0 ? categories : [...DEFAULT_POST_CATEGORIES]
}

function readConfig(): FunctionConfig {
  const adminPassword = Deno.env.get("MDPC_ADMIN_PASSWORD")?.trim()

  if (!adminPassword) {
    throw new ConfigError("MDPC_ADMIN_PASSWORD", "required environment variable is missing or empty")
  }

  return {
    adminPassword,
    allowedOrigins: parseAllowedOrigins(Deno.env.get("MDPC_ALLOWED_ORIGINS")),
    categories: parseCategories(Deno.env.get("MDPC_POST_CATEGORIES")),
    postsBucket: resolvePostImagesBucket(Deno.env.get("MDPC_POSTS_BUCKET")),
    tempBucket: resolveTempBucket(Deno.env.get("MDPC_TEMP_BUCKET"))
  }
}

// Reads and validates the environment once (memoized). Throws ConfigError when
// invalid; a failed read is not cached, so fixed secrets apply immediately.
export function getConfig(): FunctionConfig {
  if (!cachedConfig) {
    cachedConfig = readConfig()
  }

  return cachedConfig
}
