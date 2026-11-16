import { POST_ERROR_CODES } from "../../../shared/contracts/postErrorCodes.ts"
import { normalizePostCategory } from "../../../shared/domain/postCategory.ts"
import { appError } from "./errors.ts"

// Pure parsing and validation of the create/update multipart forms.

export type PostFormFields = {
  category: string
  title: string
  preview: string
  contentMarkdown: string
  active: boolean
  images: File[]
}

export type CreatePostForm = PostFormFields & {
  banner: File
}

export type UpdatePostForm = PostFormFields & {
  id: string
  // null keeps the current banner.
  banner: File | null
}

// "true" / "false" (any case, trimmed); null for anything else.
export function parseActiveValue(value: string): boolean | null {
  const normalized = value.trim().toLowerCase()

  if (normalized === "true") return true
  if (normalized === "false") return false

  return null
}

function invalidForm(): Error {
  return appError(POST_ERROR_CODES.INVALID_FORM_DATA)
}

function parseCommonFields(form: FormData, categories: readonly string[]): PostFormFields {
  const category = form.get("category")
  const title = form.get("title")
  const preview = form.get("preview")
  const contentMarkdown = form.get("content_markdown")
  const active = form.get("active")
  const images = form.getAll("images")

  if (
    typeof category !== "string" ||
    typeof title !== "string" ||
    typeof preview !== "string" ||
    typeof contentMarkdown !== "string" ||
    typeof active !== "string"
  ) {
    throw invalidForm()
  }

  const imageFiles = images.filter((image): image is File => image instanceof File)

  if (imageFiles.length !== images.length) {
    throw invalidForm()
  }

  const normalizedCategory = normalizePostCategory(category, categories)
  const parsedActive = parseActiveValue(active)

  if (!normalizedCategory || parsedActive === null) {
    throw invalidForm()
  }

  return {
    category: normalizedCategory,
    title,
    preview,
    contentMarkdown,
    active: parsedActive,
    images: imageFiles
  }
}

// Fields: category, title, preview, content_markdown, active, banner (file), images (files).
export function parseCreatePostForm(form: FormData, categories: readonly string[]): CreatePostForm {
  const banner = form.get("banner")

  if (!(banner instanceof File)) {
    throw invalidForm()
  }

  return { ...parseCommonFields(form, categories), banner }
}

// Same fields plus id; banner is optional.
export function parseUpdatePostForm(form: FormData, categories: readonly string[]): UpdatePostForm {
  const id = form.get("id")
  const banner = form.get("banner")

  if (typeof id !== "string" || (banner !== null && !(banner instanceof File))) {
    throw invalidForm()
  }

  return { ...parseCommonFields(form, categories), id, banner }
}
