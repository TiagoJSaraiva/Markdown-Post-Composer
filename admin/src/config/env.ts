import { parseCategoryList } from "@mdpc/shared/domain/postCategory.ts";
import { resolvePostImagesBucket } from "@mdpc/shared/constants/storage.ts";

export type Locale = "en" | "pt-BR";

export type AppConfig = {
  functionsUrl: string;
  storagePublicUrl: string;
  postsBucket: string;
  categories: string[];
  defaultCategory: string;
  locale: Locale;
  siteUrl: string;
  appTitle: string;
};

export type ConfigResult =
  | { ok: true; config: AppConfig }
  | { ok: false; missing: string[]; invalid: string[] };

export const DEFAULT_APP_TITLE = "MD Post Composer";

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

export const configResult: ConfigResult = parseEnv(import.meta.env);

/** Only call after the configuration gate has passed (see App). */
export function getConfig(): AppConfig {
  if (!configResult.ok) {
    throw new Error("Invalid MDPC configuration");
  }

  return configResult.config;
}
