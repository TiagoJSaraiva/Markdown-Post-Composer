/*
 * Environment configuration of the Edge Functions (MDPC_* variables).
 * Validated once and memoized by getConfig(); every handler reads it through createHandler.
 */
import {
  DEFAULT_POST_CATEGORIES,
  isValidCategoryName,
  splitCategoryList
} from "../../../shared/domain/postCategory.ts"
import { resolvePostImagesBucket, resolveTempBucket } from "../../../shared/constants/storage.ts"

/** Validated runtime configuration read from the MDPC_* environment variables. */
export type FunctionConfig = {
  /** MDPC_ADMIN_PASSWORD: required, trimmed, never empty. */
  adminPassword: string
  /** MDPC_ALLOWED_ORIGINS: normalized origins (comma separated in the variable); empty denies every browser origin. */
  allowedOrigins: string[]
  /** MDPC_POST_CATEGORIES: upper-case category names; defaults to DEFAULT_POST_CATEGORIES. */
  categories: string[]
  /** MDPC_POSTS_BUCKET: bucket holding post images. */
  postsBucket: string
  /** MDPC_TEMP_BUCKET: bucket holding temp images. */
  tempBucket: string
  /**
   * MDPC_PUBLIC_STORAGE_URL: optional public base for Storage URLs
   * (`.../storage/v1/object/public`). Needed locally, where SUPABASE_URL is the
   * Docker-internal host; null means "derive from SUPABASE_URL".
   */
  publicStorageUrl: string | null
}

/**
 * A missing or invalid environment variable. Handlers answer it as
 * 500 SERVER_MISCONFIGURED; the message goes to the logs, never to the client.
 */
export class ConfigError extends Error {
  /** Name of the offending environment variable. */
  variable: string

  /**
   * @param variable - Name of the offending environment variable.
   * @param reason - What is wrong with it.
   */
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
    tempBucket: resolveTempBucket(Deno.env.get("MDPC_TEMP_BUCKET")),
    publicStorageUrl: parsePublicStorageUrl(Deno.env.get("MDPC_PUBLIC_STORAGE_URL"))
  }
}

function parsePublicStorageUrl(raw: string | undefined): string | null {
  const value = raw?.trim()

  if (!value) return null

  try {
    const parsed = new URL(value)

    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return value.replace(/\/+$/, "")
    }
  } catch {
    // reported below
  }

  throw new ConfigError(
    "MDPC_PUBLIC_STORAGE_URL",
    `invalid URL "${value}" (expected e.g. http://127.0.0.1:54321/storage/v1/object/public)`
  )
}

/**
 * Reads and validates the environment once (memoized). A failed read is not
 * cached, so fixed secrets apply immediately.
 *
 * @returns The validated configuration.
 * @throws {ConfigError} When a variable is missing or invalid.
 */
export function getConfig(): FunctionConfig {
  if (!cachedConfig) {
    cachedConfig = readConfig()
  }

  return cachedConfig
}
