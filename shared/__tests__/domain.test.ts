/*
 * Vitest tests for domain/postCategory.ts and domain/tempImageNaming.ts.
 */
import { describe, expect, it } from "vitest"
import {
  isValidCategoryName,
  normalizePostCategory,
  parseCategoryList,
  splitCategoryList
} from "../domain/postCategory.ts"
import {
  TEMP_IMAGE_VERSION_SEPARATOR,
  buildTempFileName,
  extractVersionToken,
  getDisplayNameFromPath,
  getVersionTokenFromPath,
  normalizeImageName,
  removeVersionSuffix,
  splitFileName,
  withVersionParam
} from "../domain/tempImageNaming.ts"

describe("postCategory", () => {
  it("splitCategoryList trims, upper-cases and de-duplicates without validating", () => {
    expect(splitCategoryList(" blog, News ,,BLOG, bad name")).toEqual(["BLOG", "NEWS", "BAD NAME"])
    expect(splitCategoryList("")).toEqual([])
    expect(splitCategoryList(null)).toEqual([])
    expect(splitCategoryList(undefined)).toEqual([])
  })

  it.each([
    ["BLOG", true],
    ["NEWS_2-X", true],
    ["blog", false],
    ["A B", false],
    ["", false],
    ["Á", false]
  ])("isValidCategoryName(%j) = %s", (value, expected) => {
    expect(isValidCategoryName(value)).toBe(expected)
  })

  it("parseCategoryList keeps valid entries and falls back when none remain", () => {
    expect(parseCategoryList("blog,bad name,news")).toEqual(["BLOG", "NEWS"])
    expect(parseCategoryList("bad name")).toEqual(["BLOG"])
    expect(parseCategoryList(undefined, ["X"])).toEqual(["X"])
  })

  it("normalizePostCategory matches case-insensitively against the allowed list", () => {
    expect(normalizePostCategory(" news ", ["BLOG", "NEWS"])).toBe("NEWS")
    expect(normalizePostCategory("other", ["BLOG"])).toBeNull()
    expect(normalizePostCategory("", ["BLOG"])).toBeNull()
  })
})

describe("tempImageNaming", () => {
  it.each([
    ["photo.png", { baseName: "photo", extension: "png" }],
    ["my.photo.png", { baseName: "my.photo", extension: "png" }],
    ["noext", { baseName: "noext", extension: "" }],
    [".hidden", { baseName: ".hidden", extension: "" }],
    ["trailing.", { baseName: "trailing.", extension: "" }]
  ])("splitFileName(%j)", (name, expected) => {
    expect(splitFileName(name)).toEqual(expected)
  })

  it("normalizeImageName makes names storage-safe", () => {
    expect(normalizeImageName("  My Photo (1)!  ")).toBe("my_photo_1")
    expect(normalizeImageName("Ação")).toBe("ao")
    expect(normalizeImageName("***")).toBe("")
  })

  it("buildTempFileName appends the version token and extension", () => {
    expect(buildTempFileName("My Photo", "png", "tok")).toBe(`my_photo${TEMP_IMAGE_VERSION_SEPARATOR}tok.png`)
    expect(buildTempFileName("a", "", "tok")).toBe(`a${TEMP_IMAGE_VERSION_SEPARATOR}tok`)
  })

  it("buildTempFileName generates a token and a fallback name when needed", () => {
    expect(buildTempFileName("a", "png")).toMatch(/^a__v__\d+_[a-z0-9]+\.png$/)
    expect(buildTempFileName("***", "png", "t")).toMatch(/^img_\d+__v__t\.png$/)
  })

  it("version suffix helpers split on the LAST separator", () => {
    expect(removeVersionSuffix("name__v__123_abc")).toBe("name")
    expect(removeVersionSuffix("plain")).toBe("plain")
    expect(removeVersionSuffix("a__v__b__v__c")).toBe("a__v__b")
    expect(extractVersionToken("name__v__123_abc")).toBe("123_abc")
    expect(extractVersionToken("plain")).toBeNull()
    expect(extractVersionToken("name__v__")).toBeNull()
  })

  it("display name and version token come from the storage path", () => {
    expect(getDisplayNameFromPath("folder/my_photo__v__9_x.png")).toBe("my_photo")
    expect(getVersionTokenFromPath("folder/my_photo__v__9_x.png")).toBe("9_x")
    expect(getVersionTokenFromPath("old.png")).toBe("legacy")
  })

  it("withVersionParam adds ?v= or &v= and encodes the token", () => {
    expect(withVersionParam("https://x/a.png", "a__v__t1.png")).toBe("https://x/a.png?v=t1")
    expect(withVersionParam("https://x/a.png?z=1", "a.png")).toBe("https://x/a.png?z=1&v=legacy")
  })
})
