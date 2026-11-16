/*
 * Deno tests for _lib/images.ts (validation, naming, path replacement).
 */
import { assertEquals, assertThrows } from "@std/assert"
import { MAX_IMAGE_BYTES } from "@shared/constants/images.ts"
import { AppError } from "../_lib/errors.ts"
import {
  buildBannerPath,
  hasAcceptedExtension,
  planContentImages,
  replaceImagePaths,
  validateImageFile
} from "../_lib/images.ts"

function file(name: string, type = "image/png", size = 4): File {
  return new File([new Uint8Array(size)], name, { type })
}

function codeOf(fn: () => unknown): string {
  return assertThrows(fn, AppError).code
}

Deno.test("hasAcceptedExtension is case-insensitive and rejects unknown/missing extensions", () => {
  const cases: [string, boolean][] = [
    ["a.png", true], ["a.JPG", true], ["a.jpeg", true], ["a.WebP", true],
    ["a.gif", false], ["a.svg", false], ["png", false], ["a.", false], [".png", false]
  ]

  for (const [name, expected] of cases) {
    assertEquals(hasAcceptedExtension(name), expected, name)
  }
})

Deno.test("validateImageFile accepts valid files, including the exact size limit", () => {
  validateImageFile(file("a.png"))
  validateImageFile(file("a.jpg", "image/jpeg"))
  validateImageFile(file("a.webp", "image/webp"))
  validateImageFile(file("big.png", "image/png", MAX_IMAGE_BYTES))
})

Deno.test("validateImageFile rejects bad extension, bad MIME and oversize files", () => {
  assertEquals(codeOf(() => validateImageFile(file("a.gif", "image/gif"))), "INVALID_IMAGE_TYPE")
  assertEquals(codeOf(() => validateImageFile(file("a.png", "text/plain"))), "INVALID_IMAGE_TYPE")
  assertEquals(codeOf(() => validateImageFile(file("a.png", ""))), "INVALID_IMAGE_TYPE")
  assertEquals(codeOf(() => validateImageFile(file("a.svg", "image/png"))), "INVALID_IMAGE_TYPE")
  assertEquals(codeOf(() => validateImageFile(file("big.png", "image/png", MAX_IMAGE_BYTES + 1))), "IMAGE_TOO_LARGE")
})

Deno.test("validateImageFile error details name the file", () => {
  const error = assertThrows(() => validateImageFile(file("x.gif", "image/gif")), AppError)

  assertEquals(error.details?.file, "x.gif")
})

Deno.test("buildBannerPath uses the last extension and the given version", () => {
  assertEquals(buildBannerPath("p1", file("my.banner.JPG"), 42), "p1/banner_42.JPG")
})

Deno.test("buildBannerPath requires an extension", () => {
  assertEquals(codeOf(() => buildBannerPath("p1", file("banner"), 1)), "INVALID_EXTENSION")
})

Deno.test("planContentImages splits keys at the LAST dot", () => {
  const [image] = planContentImages("p1", [file("my.photo.png")])

  assertEquals(image.key, "my.photo")
  assertEquals(image.path, "p1/my.photo.png")
})

Deno.test("planContentImages rejects duplicate keys, even with different extensions", () => {
  assertEquals(
    codeOf(() => planContentImages("p1", [file("a.png"), file("a.jpg", "image/jpeg")])),
    "DUPLICATE_IMAGE_NAME"
  )
})

Deno.test("planContentImages validates every file", () => {
  assertEquals(codeOf(() => planContentImages("p1", [file("a.png"), file("b.gif", "image/gif")])), "INVALID_IMAGE_TYPE")
})

Deno.test("replaceImagePaths rewrites image references only, never plain text", () => {
  const out = replaceImagePaths("![a](a) a (a) and [link](a) ![b](b)", { a: "p/a.png", b: "p/b.png" })

  assertEquals(out, "![a](p/a.png) a (a) and [link](a) ![b](p/b.png)")
})

Deno.test("replaceImagePaths accepts ./name, name.ext and keeps titles", () => {
  const paths = { cat: "p/cat.png", dog: "p/dog.jpg" }
  const md = '![1](./cat) ![2](cat.png "Kitty") ![3](./dog.jpeg (Rex)) ![4]( dog  )'

  assertEquals(replaceImagePaths(md, paths), '![1](p/cat.png) ![2](p/cat.png "Kitty") ![3](p/dog.jpg (Rex)) ![4](p/dog.jpg)')
})

Deno.test("replaceImagePaths leaves paths, URLs and unknown names untouched", () => {
  const md = "![a](x/cat) ![b](https://h/cat) ![c](cat?v=1) ![d](other)"

  assertEquals(replaceImagePaths(md, { cat: "p/cat.png" }), md)
})

Deno.test("replaceImagePaths treats $ in paths literally", () => {
  assertEquals(replaceImagePaths("![x](x)", { x: "p/$&$1$$.png" }), "![x](p/$&$1$$.png)")
})

Deno.test("replaceImagePaths matches names with regex metacharacters literally", () => {
  assertEquals(replaceImagePaths("![](a.b) ![](aXb) ![](c+d)", { "a.b": "P1", "c+d": "P2" }), "![](P1) ![](aXb) ![](P2)")
})

Deno.test("replaceImagePaths handles overlapping names without rescanning", () => {
  const paths = { img: "p/img.png", "img.1": "p/img.1.png", p: "p/p.png" }

  assertEquals(replaceImagePaths("![](img) ![](img.1) ![](p)", paths), "![](p/img.png) ![](p/img.1.png) ![](p/p.png)")
})

Deno.test("replaceImagePaths returns the markdown untouched without images", () => {
  assertEquals(replaceImagePaths("(a)", {}), "(a)")
})
