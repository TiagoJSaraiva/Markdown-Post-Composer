import { ADMIN_PASSWORD_HEADER } from "../constants/http.ts"
import type { BuildPostFormDataParams } from "../types/post.ts"

export type ServiceResult = {
  status: number
  data: unknown
  error: unknown
}

export type TypedServiceResult<TData = unknown, TError = unknown> = {
  status: number
  data: TData
  error: TError | null
}

export function getPasswordRequiredError(password: string): ServiceResult | null {
  if (!password) {
    return { status: 400, data: null, error: "PASSWORD_REQUIRED" }
  }

  return null
}

export function buildAdminHeaders(password: string, extra?: HeadersInit): Headers {
  const headers = new Headers(extra)

  headers.set(ADMIN_PASSWORD_HEADER, password)

  return headers
}

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
