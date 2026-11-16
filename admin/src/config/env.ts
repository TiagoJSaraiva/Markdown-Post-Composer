/*
 * Reads and validates the `VITE_MDPC_*` environment variables once at load. The result
 * (configResult) gates the whole app; getConfig gives typed access afterwards.
 */
import { parseCategoryList } from "@mdpc/shared/domain/postCategory.ts";
import { resolvePostImagesBucket } from "@mdpc/shared/constants/storage.ts";

/** Languages the admin is translated to. */
export type Locale = "en" | "pt-BR";

/** Validated runtime configuration of the admin. */
export type AppConfig = {
  /** Base URL of the Edge Functions, without trailing slash. */
  functionsUrl: string;
  /** Base URL for public Storage objects, without trailing slash. */
  storagePublicUrl: string;
  /** Bucket holding the published post images. */
  postsBucket: string;
  /** Allowed post categories (upper-case, at least one). */
  categories: string[];
  /** Category preselected for new posts (the first one). */
  defaultCategory: string;
  /** Interface language, fixed at build time. */
  locale: Locale;
  /** Public website URL for the toolbar shortcut; empty hides the button. */
  siteUrl: string;
  /** Browser tab title. */
  appTitle: string;
};

/** Outcome of parseEnv: the configuration, or the names of the offending variables. */
export type ConfigResult =
  | { ok: true; config: AppConfig }
  | { ok: false; missing: string[]; invalid: string[] };

/** Tab title used when VITE_MDPC_APP_TITLE is not set. */
export const DEFAULT_APP_TITLE = "MD Post Composer";

/**
 * Picks the interface language.
 *
 * @param raw - Raw VITE_MDPC_LOCALE value.
 * @returns `pt-BR` when requested, `en` for anything else.
 */
export function resolveLocale(raw: string | undefined): Locale {
  return raw?.trim() === "pt-BR" ? "pt-BR" : "en";
}

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validates the environment variables and builds the configuration.
 *
 * @param env - Vite environment (`import.meta.env`).
 * @returns The configuration, or the missing and invalid variable names when a required URL is
 * absent or a URL is not http(s).
 */
export function parseEnv(env: ImportMetaEnv): ConfigResult {
  const missing: string[] = [];
  const invalid: string[] = [];

  function readUrl(name: string, raw: string | undefined, required: boolean): string {
    const value = raw?.trim() ?? "";

    if (!value) {
      if (required) missing.push(name);
      return "";
    }

    if (!isHttpUrl(value)) {
      invalid.push(name);
      return "";
    }

    return trimTrailingSlashes(value);
  }

  const functionsUrl = readUrl("VITE_MDPC_FUNCTIONS_URL", env.VITE_MDPC_FUNCTIONS_URL, true);
  const storagePublicUrl = readUrl("VITE_MDPC_STORAGE_PUBLIC_URL", env.VITE_MDPC_STORAGE_PUBLIC_URL, true);
  const siteUrl = readUrl("VITE_MDPC_SITE_URL", env.VITE_MDPC_SITE_URL, false);

  if (missing.length > 0 || invalid.length > 0) {
    return { ok: false, missing, invalid };
  }

  const categories = parseCategoryList(env.VITE_MDPC_POST_CATEGORIES);

  return {
    ok: true,
    config: {
      functionsUrl,
      storagePublicUrl,
      postsBucket: resolvePostImagesBucket(env.VITE_MDPC_POSTS_BUCKET),
      categories,
      defaultCategory: categories[0],
      locale: resolveLocale(env.VITE_MDPC_LOCALE),
      siteUrl,
      appTitle: env.VITE_MDPC_APP_TITLE?.trim() || DEFAULT_APP_TITLE
    }
  };
}

/** Result of parsing the current environment, evaluated once at module load. */
export const configResult: ConfigResult = parseEnv(import.meta.env);

/**
 * Only call after the configuration gate has passed (see App).
 *
 * @returns The validated configuration.
 * @throws Error when the configuration is invalid.
 */
export function getConfig(): AppConfig {
  if (!configResult.ok) {
    throw new Error("Invalid MDPC configuration");
  }

  return configResult.config;
}
