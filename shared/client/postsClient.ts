import { isLoadCardsSuccessResponse } from "../contracts/loadCards.ts"
import type { PostCard } from "../contracts/loadCards.ts"
import { isLoadPostSuccessResponse } from "../contracts/loadPost.ts"
import type { PostDetails } from "../contracts/loadPost.ts"
import { buildStoragePublicUrl, resolveMarkdownAssetUrl, trimTrailingSlashes } from "./storageUrls.ts"

export type PostsClientResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; details?: Record<string, unknown> }

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export type PostsClientOptions = {
  /** e.g. https://<ref>.supabase.co/functions/v1 */
  functionsUrl: string
  /** e.g. https://<ref>.supabase.co/storage/v1/object/public */
  storagePublicUrl: string
  /** Defaults to "post-images". */
  postsBucket?: string
  fetch?: FetchLike
  /** Extra headers sent with every request (e.g. apikey/Authorization). */
  headers?: Record<string, string>
}

export type ListPostsOptions = {
  /** Case-insensitive client-side filter on post_type. */
  category?: string
  includeInactive?: boolean
  /** Sent as X-Admin-Password when provided. */
  adminPassword?: string
}

export type GetPostOptions = {
  /** Required to load an inactive post; sent as X-Admin-Password. */
  adminPassword?: string
}

export type GetPostBySlugOptions = {
  category?: string
}

export type PostsClient = {
  listPosts(options?: ListPostsOptions): Promise<PostsClientResult<PostCard[]>>
  getPost(id: string, options?: GetPostOptions): Promise<PostsClientResult<PostDetails>>
  getPostBySlug(slug: string, options?: GetPostBySlugOptions): Promise<PostsClientResult<PostDetails>>
  buildPublicUrl(path: string): string
  resolveMarkdownAssetUrl(url: string): string
}

export const DEFAULT_POSTS_BUCKET = "post-images"

type Failure = { ok: false; status: number; error: string; details?: Record<string, unknown> }

function fail(status: number, error: string, details?: Record<string, unknown>): Failure {
  return details ? { ok: false, status, error, details } : { ok: false, status, error }
}

function readErrorBody(body: unknown): { error?: string; details?: Record<string, unknown> } {
  if (typeof body !== "object" || body === null) {
    return {}
  }

  const record = body as Record<string, unknown>
  const error = typeof record.error === "string" ? record.error : undefined
  const details =
    typeof record.details === "object" && record.details !== null && !Array.isArray(record.details)
      ? (record.details as Record<string, unknown>)
      : undefined

  return { error, details }
}

export function createPostsClient(options: PostsClientOptions): PostsClient {
  const functionsUrl = trimTrailingSlashes(options.functionsUrl.trim())
  const bucket = options.postsBucket?.trim() || DEFAULT_POSTS_BUCKET
  const storageOptions = { storagePublicUrl: options.storagePublicUrl, bucket }
  const baseHeaders = options.headers ?? {}

  async function request<T>(
    path: string,
    query: Record<string, string>,
    extraHeaders: Record<string, string>,
    guard: (body: unknown) => body is { success: true; data: T }
  ): Promise<PostsClientResult<T>> {
    const fetchImpl: FetchLike = options.fetch ?? ((input, init) => globalThis.fetch(input, init))
    const search = new URLSearchParams(query).toString()
    const url = `${functionsUrl}/${path}${search ? `?${search}` : ""}`

    let response: Response
    try {
      response = await fetchImpl(url, { method: "GET", headers: { ...baseHeaders, ...extraHeaders } })
    } catch (error) {
      return fail(0, "NETWORK_ERROR", { message: error instanceof Error ? error.message : String(error) })
    }

    let body: unknown
    try {
      body = await response.json()
    } catch {
      body = undefined
    }

    if (!response.ok) {
      const parsed = readErrorBody(body)
      return fail(response.status, parsed.error ?? "INVALID_RESPONSE", parsed.details)
    }

    if (!guard(body)) {
      return fail(response.status, "INVALID_RESPONSE")
    }

    return { ok: true, data: body.data }
  }

  async function listPosts(listOptions: ListPostsOptions = {}): Promise<PostsClientResult<PostCard[]>> {
    const query: Record<string, string> = listOptions.includeInactive ? { include_inactive: "true" } : {}
    const headers: Record<string, string> = listOptions.adminPassword
      ? { "X-Admin-Password": listOptions.adminPassword }
      : {}

    const result = await request<PostCard[]>("load_cards", query, headers, isLoadCardsSuccessResponse)

    if (!result.ok || !listOptions.category) {
      return result
    }

    const wanted = listOptions.category.trim().toLowerCase()
    return { ok: true, data: result.data.filter((card) => card.post_type.toLowerCase() === wanted) }
  }

  function getPost(id: string, getOptions: GetPostOptions = {}): Promise<PostsClientResult<PostDetails>> {
    const headers: Record<string, string> = getOptions.adminPassword
      ? { "X-Admin-Password": getOptions.adminPassword }
      : {}

    return request<PostDetails>("load_post", { id }, headers, isLoadPostSuccessResponse)
  }

  async function getPostBySlug(
    slug: string,
    slugOptions: GetPostBySlugOptions = {}
  ): Promise<PostsClientResult<PostDetails>> {
    const list = await listPosts({ category: slugOptions.category })

    if (!list.ok) {
      return list
    }

    const card = list.data.find((item) => item.slug === slug)

    if (!card) {
      return fail(404, "POST_NOT_FOUND")
    }

    return getPost(card.id)
  }

  return {
    listPosts,
    getPost,
    getPostBySlug,
    buildPublicUrl: (path) => buildStoragePublicUrl(path, storageOptions),
    resolveMarkdownAssetUrl: (url) => resolveMarkdownAssetUrl(url, storageOptions)
  }
}
