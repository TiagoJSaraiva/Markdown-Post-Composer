/*
 * Parsing and validation of the multipart forms sent to create_post and
 * update_post. Pure: operates on a FormData and returns typed fields.
 */
import { POST_ERROR_CODES } from "../../../shared/contracts/postErrorCodes.ts"
import { normalizePostCategory } from "../../../shared/domain/postCategory.ts"
import { appError } from "./errors.ts"

/** Fields shared by the create and update forms, already validated. */
export type PostFormFields = {
  /** Upper-case category, one of the configured categories. */
  category: string
  title: string
  preview: string
  contentMarkdown: string
  active: boolean
  /** Content images referenced from the markdown. */
  images: File[]
}

/** Parsed create_post form; the banner is required. */
export type CreatePostForm = PostFormFields & {
  banner: File
}

/** Parsed update_post form. */
export type UpdatePostForm = PostFormFields & {
  id: string
  /** `null` keeps the current banner. */
  banner: File | null
}

/**
 * Parses the `active` form field.
 *
 * @param value - Raw field value.
 * @returns `true` or `false` for "true"/"false" (any case, trimmed), `null` otherwise.
 */
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

/**
 * Parses the create_post form. Fields: category, title, preview,
 * content_markdown, active, banner (file) and images (files).
 *
 * @param form - Request form data.
 * @param categories - Allowed categories.
 * @returns The validated fields.
 * @throws {AppError} `INVALID_FORM_DATA` when a field is missing, has the wrong type or is invalid.
 */
export function parseCreatePostForm(form: FormData, categories: readonly string[]): CreatePostForm {
  const banner = form.get("banner")

  if (!(banner instanceof File)) {
    throw invalidForm()
  }

  return { ...parseCommonFields(form, categories), banner }
}

/**
 * Parses the update_post form: the create fields plus `id`, with an optional banner.
 *
 * @param form - Request form data.
 * @param categories - Allowed categories.
 * @returns The validated fields.
 * @throws {AppError} `INVALID_FORM_DATA` when a field is missing, has the wrong type or is invalid.
 */
export function parseUpdatePostForm(form: FormData, categories: readonly string[]): UpdatePostForm {
  const id = form.get("id")
  const banner = form.get("banner")

  if (typeof id !== "string" || (banner !== null && !(banner instanceof File))) {
    throw invalidForm()
  }

  return { ...parseCommonFields(form, categories), id, banner }
}
