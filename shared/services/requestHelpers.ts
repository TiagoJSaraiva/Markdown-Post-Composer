/*
 * Browser-side helpers to call the Edge Functions: admin headers, form data
 * building and fetch result normalization. Used by the admin services.
 */
import { ADMIN_PASSWORD_HEADER } from "../constants/http.ts"
import type { BuildPostFormDataParams } from "../types/post.ts"

/** Normalized outcome of a request; see handleRequest. */
export type ServiceResult = {
  /** HTTP status, or 0 when the request itself failed. */
  status: number
  data: unknown
  /** The thrown error when the request failed, otherwise `null`. */
  error: unknown
}

/** ServiceResult with typed `data` and `error`. */
export type TypedServiceResult<TData = unknown, TError = unknown> = {
  status: number
  data: TData
  error: TError | null
}

/**
 * Builds the local error for an empty password, so no request is sent.
 *
 * @param password - Password typed by the user.
 * @returns A `PASSWORD_REQUIRED` result when empty, otherwise `null`.
 */
export function getPasswordRequiredError(password: string): ServiceResult | null {
  if (!password) {
    return { status: 400, data: null, error: "PASSWORD_REQUIRED" }
  }

  return null
}

/**
 * Builds request headers carrying the admin password.
 *
 * @param password - Admin password.
 * @param extra - Other headers to keep.
 * @returns The headers, with X-Admin-Password set.
 */
export function buildAdminHeaders(password: string, extra?: HeadersInit): Headers {
  const headers = new Headers(extra)

  headers.set(ADMIN_PASSWORD_HEADER, password)

  return headers
}

/**
 * Builds the multipart form expected by create_post and update_post. `id` is
 * included only for updates.
 *
 * @param params - Post fields, banner and images.
 * @returns The form data.
 */
export function buildPostFormData(params: BuildPostFormDataParams): FormData {
  const {
    id,
    category,
    title,
    preview,
    content_markdown,
    active,
    banner,
    images,
  } = params

  const form = new FormData()

  if (id) {
    form.append("id", id)
  }

  form.append("category", category)
  form.append("title", title)
  form.append("preview", preview)
  form.append("content_markdown", content_markdown)
  form.append("active", String(active))

  if (banner) {
    form.append("banner", banner, banner.name || "banner")
  }

  for (const image of images) {
    form.append("images", image.file, image.name)
  }

  return form
}

/**
 * Awaits a fetch and normalizes the outcome without throwing. The body is parsed
 * as JSON, falling back to `{ raw: <text> }`; network failures give status 0.
 *
 * @param request - Pending fetch.
 * @returns The status, parsed body and error.
 */
export async function handleRequest(request: Promise<Response>): Promise<ServiceResult> {
  try {
    const res = await request
    const text = await res.text()

    let data: unknown

    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text }
    }

    return { status: res.status, data, error: null }
  } catch (error) {
    console.error("Request failed:", error)
    return { status: 0, data: null, error }
  }
}

/**
 * handleRequest with caller-supplied types for the body and the error.
 *
 * @param request - Pending fetch.
 * @returns The status, body and error. The types are not checked at runtime.
 */
export async function handleTypedRequest<TData = unknown, TError = unknown>(
  request: Promise<Response>
): Promise<TypedServiceResult<TData, TError>> {
  const result = await handleRequest(request)

  return {
    status: result.status,
    data: result.data as TData,
    error: result.error as TError | null,
  }
}
