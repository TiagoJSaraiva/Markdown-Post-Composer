/*
 * Vitest suite for shared/domain/markdownImageRefs.ts: the image reference rules shared
 * by the Edge Functions (rewrite on save) and the admin (validation and preview).
 */
import { describe, expect, it } from "vitest"
import {
  getLocalImageName,
  listImageTargets,
  lookupLocalImage,
  rewriteImageTargets
} from "../domain/markdownImageRefs.ts"

describe("listImageTargets", () => {
  it("returns image targets without titles and ignores links and plain text", () => {
    const md = '![a](cat) [link](x) (dog) ![b](  ./dog.png "Rex" ) ![c](a(1).png) ![d](u (t))'

    expect(listImageTargets(md)).toEqual(["cat", "./dog.png", "a(1).png", "u"])
  })
})

describe("rewriteImageTargets", () => {
  it("keeps alt text and title, and leaves unresolved targets byte-for-byte", () => {
    const md = "![A](cat 'T') ![B](  keep  )"
    const out = rewriteImageTargets(md, (target) => (target === "cat" ? "p/$&.png" : null))

    expect(out).toBe("![A](p/$&.png 'T') ![B](  keep  )")
  })
})

describe("getLocalImageName", () => {
  it.each([
    ["cat", "cat"],
    ["./cat.png", "cat.png"],
    ["my.photo.jpg", "my.photo.jpg"],
    ["id/cat.png", null],
    ["https://h/cat.png", null],
    ["cat.png?v=1", null],
    ["cat#x", null],
    ["./", null]
  ])("%s -> %s", (target, expected) => {
    expect(getLocalImageName(target)).toBe(expected)
  })
})

describe("lookupLocalImage", () => {
  const byName = { cat: 1, "my.photo": 2, my: 3 }

  it.each([
    ["cat", 1],
    ["./cat.webp", 1],
    ["my.photo", 2],
    ["my.photo.jpg", 2],
    ["my", 3],
    ["dog", undefined],
    ["toString", undefined],
    ["id/cat", undefined]
  ])("%s -> %s", (target, expected) => {
    expect(lookupLocalImage(target, byName)).toBe(expected)
  })
})
