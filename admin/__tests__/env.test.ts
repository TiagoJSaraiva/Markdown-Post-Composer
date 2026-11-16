/*
 * Tests of the environment parsing: required URLs, defaults, categories and locale.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_APP_TITLE, parseEnv, resolveLocale } from "../src/config/env";

const VALID = {
  VITE_MDPC_FUNCTIONS_URL: "https://proj.supabase.co/functions/v1",
  VITE_MDPC_STORAGE_PUBLIC_URL: "https://proj.supabase.co/storage/v1/object/public",
} as const;

/** parseEnv only reads the VITE_MDPC_* keys, so a partial object is enough. */
function parse(env: Record<string, string | undefined>) {
  return parseEnv(env as unknown as ImportMetaEnv);
}

describe("parseEnv", () => {
  it("applies defaults for the optional values", () => {
    expect(parse(VALID)).toEqual({
      ok: true,
      config: {
        functionsUrl: VALID.VITE_MDPC_FUNCTIONS_URL,
        storagePublicUrl: VALID.VITE_MDPC_STORAGE_PUBLIC_URL,
        postsBucket: "post-images",
        categories: ["BLOG"],
        defaultCategory: "BLOG",
        locale: "en",
        siteUrl: "",
        appTitle: DEFAULT_APP_TITLE,
      },
    });
  });

  it("reads every optional value and trims trailing slashes from URLs", () => {
    const result = parse({
      VITE_MDPC_FUNCTIONS_URL: " https://f.example.com/v1/// ",
      VITE_MDPC_STORAGE_PUBLIC_URL: "http://localhost:54321/storage/",
      VITE_MDPC_SITE_URL: "https://site.example.com/",
      VITE_MDPC_POSTS_BUCKET: " my-bucket ",
      VITE_MDPC_POST_CATEGORIES: "news, blog, bad name",
      VITE_MDPC_LOCALE: "pt-BR",
      VITE_MDPC_APP_TITLE: "  My Admin ",
    });

    expect(result).toEqual({
      ok: true,
      config: {
        functionsUrl: "https://f.example.com/v1",
        storagePublicUrl: "http://localhost:54321/storage",
        postsBucket: "my-bucket",
        categories: ["NEWS", "BLOG"],
        defaultCategory: "NEWS",
        locale: "pt-BR",
        siteUrl: "https://site.example.com",
        appTitle: "My Admin",
      },
    });
  });

  it("falls back to the default category list when none is valid", () => {
    const result = parse({ ...VALID, VITE_MDPC_POST_CATEGORIES: "bad name, !!" });

    expect(result).toMatchObject({ ok: true, config: { categories: ["BLOG"], defaultCategory: "BLOG" } });
  });

  it("reports missing required URLs", () => {
    expect(parse({})).toEqual({
      ok: false,
      missing: ["VITE_MDPC_FUNCTIONS_URL", "VITE_MDPC_STORAGE_PUBLIC_URL"],
      invalid: [],
    });
    expect(parse({ ...VALID, VITE_MDPC_FUNCTIONS_URL: "   " })).toMatchObject({
      ok: false,
      missing: ["VITE_MDPC_FUNCTIONS_URL"],
    });
  });

  it.each(["not a url", "ftp://host/x", "javascript:alert(1)"])("reports %j as invalid", (value) => {
    expect(parse({ ...VALID, VITE_MDPC_STORAGE_PUBLIC_URL: value })).toEqual({
      ok: false,
      missing: [],
      invalid: ["VITE_MDPC_STORAGE_PUBLIC_URL"],
    });
  });

  it("validates the optional site URL only when set", () => {
    expect(parse({ ...VALID, VITE_MDPC_SITE_URL: "nope" })).toMatchObject({
      ok: false,
      invalid: ["VITE_MDPC_SITE_URL"],
    });
    expect(parse({ ...VALID, VITE_MDPC_SITE_URL: "" })).toMatchObject({ ok: true });
  });
});

describe("resolveLocale", () => {
  it.each([
    ["pt-BR", "pt-BR"],
    [" pt-BR ", "pt-BR"],
    ["en", "en"],
    ["pt", "en"],
    ["fr", "en"],
    ["", "en"],
    [undefined, "en"],
  ])("%j -> %s", (raw, expected) => {
    expect(resolveLocale(raw)).toBe(expected);
  });
});
