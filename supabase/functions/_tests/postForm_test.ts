import { assertEquals, assertThrows } from "@std/assert"
import { AppError } from "../_lib/errors.ts"
import { parseActiveValue, parseCreatePostForm, parseUpdatePostForm } from "../_lib/postForm.ts"

const CATEGORIES = ["BLOG", "NEWS"]

function png(name = "a.png"): File {
  return new File([new Uint8Array(2)], name, { type: "image/png" })
}

function buildForm(overrides: Record<string, string | File | null> = {}, images: File[] = []): FormData {
  const fields: Record<string, string | File | null> = {
    category: "BLOG",
    title: "T",
    preview: "P",
    content_markdown: "# md",
    active: "true",
    banner: png("banner.png"),
    ...overrides
  }
  const form = new FormData()

  for (const [key, value] of Object.entries(fields)) {
    if (value !== null) form.append(key, value)
  }

  for (const image of images) form.append("images", image)

  return form
}

function invalid(fn: () => unknown): void {
  const error = assertThrows(fn, AppError)

  assertEquals(error.code, "INVALID_FORM_DATA")
  assertEquals(error.status, 400)
}

Deno.test("parseActiveValue accepts true/false in any case and trims", () => {
  assertEquals(parseActiveValue("true"), true)
  assertEquals(parseActiveValue(" FALSE "), false)
  assertEquals(parseActiveValue("yes"), null)
  assertEquals(parseActiveValue("1"), null)
  assertEquals(parseActiveValue(""), null)
})

Deno.test("parseCreatePostForm parses a valid form", () => {
  const form = parseCreatePostForm(buildForm({}, [png("x.png")]), CATEGORIES)

  assertEquals(form.category, "BLOG")
  assertEquals(form.title, "T")
  assertEquals(form.contentMarkdown, "# md")
  assertEquals(form.active, true)
  assertEquals(form.banner.name, "banner.png")
  assertEquals(form.images.map((f) => f.name), ["x.png"])
})

Deno.test("parseCreatePostForm normalizes lower-case/padded categories", () => {
  assertEquals(parseCreatePostForm(buildForm({ category: " news " }), CATEGORIES).category, "NEWS")
})

Deno.test("parseCreatePostForm rejects unknown categories and bad active values", () => {
  invalid(() => parseCreatePostForm(buildForm({ category: "OTHER" }), CATEGORIES))
  invalid(() => parseCreatePostForm(buildForm({ active: "maybe" }), CATEGORIES))
})

Deno.test("parseCreatePostForm rejects each missing required field", () => {
  for (const field of ["category", "title", "preview", "content_markdown", "active", "banner"]) {
    invalid(() => parseCreatePostForm(buildForm({ [field]: null }), CATEGORIES))
  }
})

Deno.test("parseCreatePostForm rejects a text banner and non-file images", () => {
  invalid(() => parseCreatePostForm(buildForm({ banner: "not-a-file" }), CATEGORIES))

  const form = buildForm()
  form.append("images", "not-a-file")
  invalid(() => parseCreatePostForm(form, CATEGORIES))
})

Deno.test("parseUpdatePostForm requires id and allows a missing banner", () => {
  const form = parseUpdatePostForm(buildForm({ id: "abc", banner: null }), CATEGORIES)

  assertEquals(form.id, "abc")
  assertEquals(form.banner, null)
  assertEquals(form.images, [])
  invalid(() => parseUpdatePostForm(buildForm({ banner: null }), CATEGORIES))
})

Deno.test("parseUpdatePostForm rejects a text banner", () => {
  invalid(() => parseUpdatePostForm(buildForm({ id: "abc", banner: "x" }), CATEGORIES))
})
