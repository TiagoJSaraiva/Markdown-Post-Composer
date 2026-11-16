import { afterEach, describe, expect, it, vi } from "vitest";
import { POST_ERROR_CODES } from "@mdpc/shared/contracts/postErrorCodes.ts";
import { en, type MessageKey } from "../src/i18n/en";
import { ptBR } from "../src/i18n/ptBR";

type Locale = "en" | "pt-BR";

const dictionaries: Record<Locale, Record<MessageKey, string>> = { en, "pt-BR": ptBR };

/** Loads the i18n modules fresh with the given build-time locale. */
async function load(locale: Locale) {
  vi.resetModules();
  vi.stubEnv("VITE_MDPC_LOCALE", locale);
  const index = await import("../src/i18n/index");
  const errors = await import("../src/i18n/errors");
  // Same module instance as errors.ts, so instanceof checks hold.
  const { ApiError } = await import("../src/lib/apiError");

  return { t: index.t, errors, ApiError };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("dictionaries", () => {
  it("have exactly the same keys", () => {
    expect(Object.keys(ptBR).sort()).toEqual(Object.keys(en).sort());
  });

  it("have the same placeholders per key", () => {
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

    for (const key of Object.keys(en) as MessageKey[]) {
      expect(placeholders(ptBR[key]), key).toEqual(placeholders(en[key]));
    }
  });
});

describe.each(["en", "pt-BR"] as const)("error messages (%s)", (locale) => {
  const dictionary = dictionaries[locale];

  it("has a message for every backend error code", async () => {
    const { t, errors } = await load(locale);

    for (const code of Object.values(POST_ERROR_CODES)) {
      const key = `error.${code}` as MessageKey;

      expect(dictionary, code).toHaveProperty(key);
      expect(errors.translateErrorCode(t, code), code).toBe(dictionary[key]);
    }
  });

  it("has messages for client-side codes", async () => {
    const { t, errors } = await load(locale);

    expect(errors.translateErrorCode(t, "NETWORK_ERROR")).toBe(dictionary["error.NETWORK_ERROR"]);
    expect(errors.translateErrorCode(t, "INVALID_RESPONSE")).toBe(dictionary["error.INVALID_RESPONSE"]);
  });

  it("interpolates details for INVALID_IMAGE_TYPE and IMAGE_TOO_LARGE", async () => {
    const { t, errors } = await load(locale);

    const type = errors.translateErrorCode(t, "INVALID_IMAGE_TYPE", {
      file: "a.gif",
      acceptedExtensions: ["jpg", "png"],
    });
    const size = errors.translateErrorCode(t, "IMAGE_TOO_LARGE", { file: "b.png", maxMb: 5 });

    expect(type).toContain("a.gif");
    expect(type).toContain("jpg, png");
    expect(type).not.toMatch(/\{\w+\}/);
    expect(size).toContain("b.png");
    expect(size).toContain("5");
    expect(size).not.toMatch(/\{\w+\}/);
  });

  it("falls back to the unknown-error message with the code", async () => {
    const { t, errors } = await load(locale);

    expect(errors.translateErrorCode(t, "SOMETHING_NEW")).toBe(t("error.UNKNOWN", { code: "SOMETHING_NEW" }));
    expect(errors.translateErrorCode(t, "SOMETHING_NEW")).toContain("SOMETHING_NEW");
    // Prototype keys are not codes.
    expect(errors.translateErrorCode(t, "toString")).toContain("toString");
  });

  it("describes thrown values", async () => {
    const { t, errors, ApiError } = await load(locale);

    expect(errors.describeError(t, new ApiError(404, "POST_NOT_FOUND"))).toBe(dictionary["error.POST_NOT_FOUND"]);
    expect(errors.describeError(t, new Error("x"))).toBe(dictionary["error.generic"]);
  });

  it("describes service and client failures", async () => {
    const { t, errors } = await load(locale);

    expect(errors.describeServiceFailure(t, 0, null)).toBe(dictionary["error.NETWORK_ERROR"]);
    expect(errors.describeServiceFailure(t, 400, { error: "INVALID_ID" })).toBe(dictionary["error.INVALID_ID"]);
    expect(errors.describeServiceFailure(t, 500, "not json")).toBeNull();
    expect(errors.describeClientFailure(t, { error: "INVALID_ID" })).toBe(dictionary["error.INVALID_ID"]);
  });
});

describe("t", () => {
  it("keeps unknown placeholders and returns the template without params", async () => {
    const { t } = await load("en");

    expect(t("error.UNKNOWN")).toBe("Unexpected error ({code}).");
    expect(t("error.UNKNOWN", { other: "x" })).toBe("Unexpected error ({code}).");
  });
});
