import { assertEquals, assertThrows } from "@std/assert"
import { AppError } from "../_lib/errors.ts"
import { requireSlug, slugify } from "../_lib/slug.ts"

const slugCases: [string, string][] = [
  ["Hello World", "hello-world"],
  ["Promoção Nova!", "promocao-nova"],
  ["Ação & Reação — 100%", "acao-reacao-100"],
  ["  spaced   out  ", "spaced-out"],
  ["--leading and trailing--", "leading-and-trailing"],
  ["a - - b", "a-b"],
  ["snake_case stays", "snake_case-stays"],
  ["Ünï cödé", "uni-code"],
  ["!!!", ""],
  ["", ""]
]

for (const [title, expected] of slugCases) {
  Deno.test(`slugify(${JSON.stringify(title)}) -> ${JSON.stringify(expected)}`, () => {
    assertEquals(slugify(title), expected)
  })
}

Deno.test("requireSlug returns the slug", () => {
  assertEquals(requireSlug("Meu Post"), "meu-post")
})

Deno.test("requireSlug throws INVALID_TITLE (400) when nothing is left", () => {
  for (const title of ["", "   ", "***"]) {
    const error = assertThrows(() => requireSlug(title), AppError)

    assertEquals(error.code, "INVALID_TITLE")
    assertEquals(error.status, 400)
  }
})
