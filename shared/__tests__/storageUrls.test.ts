/*
 * Vitest tests for client/storageUrls.ts.
 */
import { describe, expect, it } from "vitest"
import {
  buildStoragePublicUrl,
  encodePathSegments,
  isAbsoluteOrSpecialUrl,
  normalizeStoragePath,
  resolveMarkdownAssetUrl
} from "../client/storageUrls.ts"

const options = { storagePublicUrl: "https://x.supabase.co/storage/v1/object/public/", bucket: "post-images" }

describe("storageUrls", () => {
  it.each([
    ["post-images/1/a.png", "1/a.png"],
    ["/post-images/1/a.png", "1/a.png"],
    ["./1/a.png", "1/a.png"],
    ["'1/a.png'", "1/a.png"],
    ["post-images-extra/a.png", "post-images-extra/a.png"],
    ["1/post-images/a.png", "1/post-images/a.png"]
  ])("normalizeStoragePath(%j) -> %j", (input, expected) => {
    expect(normalizeStoragePath(input, "post-images")).toBe(expected)
  })

  it("encodePathSegments encodes each segment and keeps the slashes", () => {
    expect(encodePathSegments("1/my photo #1.png")).toBe("1/my%20photo%20%231.png")
    expect(encodePathSegments("a//b/")).toBe("a/b")
  })

  it("buildStoragePublicUrl joins base, bucket and encoded path", () => {
    expect(buildStoragePublicUrl("1/a b.png", options))
      .toBe("https://x.supabase.co/storage/v1/object/public/post-images/1/a%20b.png")
  })

  it("buildStoragePublicUrl strips an existing bucket prefix", () => {
    expect(buildStoragePublicUrl("post-images/1/a.png", options))
      .toBe("https://x.supabase.co/storage/v1/object/public/post-images/1/a.png")
  })

  it("buildStoragePublicUrl returns the input when it cannot resolve", () => {
    expect(buildStoragePublicUrl("1/a.png", { ...options, storagePublicUrl: " " })).toBe("1/a.png")
    expect(buildStoragePublicUrl("/", options)).toBe("/")
  })

  it.each([
    ["https://a.com/x.png", true],
    ["//cdn.com/x.png", true],
    ["data:image/png;base64,AAA", true],
    ["blob:abc", true],
    ["mailto:a@b.c", true],
    ["tel:123", true],
    ["#anchor", true],
    ["1/a.png", false],
    ["./a.png", false]
  ])("isAbsoluteOrSpecialUrl(%j) = %s", (url, expected) => {
    expect(isAbsoluteOrSpecialUrl(url)).toBe(expected)
  })

  it("resolveMarkdownAssetUrl leaves special URLs and empty values untouched", () => {
    for (const url of ["https://a.com/x.png", "data:image/png;base64,AAA", "#top", ""]) {
      expect(resolveMarkdownAssetUrl(url, options)).toBe(url)
    }
  })

  it("resolveMarkdownAssetUrl resolves relative paths", () => {
    expect(resolveMarkdownAssetUrl("1/a.png", options))
      .toBe("https://x.supabase.co/storage/v1/object/public/post-images/1/a.png")
  })
})
