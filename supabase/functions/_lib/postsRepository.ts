/*
 * Data access for the `posts` table (service role): insert with retry, update,
 * lookup, delete and card listing, plus mapping of Postgres errors to AppError.
 * Used by all post handlers.
 */
import { POST_ERROR_CODES } from "../../../shared/contracts/postErrorCodes.ts"
import { appError } from "./errors.ts"
import { getSupabase } from "./supabaseClient.ts"

/** A row of the `posts` table (columns the functions use). */
export type PostRow = {
  id: string
  /** The post category. */
  post_type: string
  title: string
  slug: string
  /** Storage path of the banner inside the posts bucket. */
  banner_path: string
  preview: string
  content_markdown: string
  active: boolean
}

/** Columns that updatePost may change: every column but the id. */
export type PostUpdate = Omit<PostRow, "id">

/** Columns selected for the post list (see load_cards). */
export const POST_CARD_COLUMNS = [
  "id", "title", "slug", "preview", "banner_path", "post_type", "active"
] as const

/** A row selected with POST_CARD_COLUMNS. */
export type PostCardRow = Pick<PostRow, (typeof POST_CARD_COLUMNS)[number]>

/** Columns selected for a single post (see load_post). */
export const POST_DETAIL_COLUMNS = [
  "id", "post_type", "title", "slug", "banner_path", "preview", "content_markdown", "active"
] as const

type DbError = { code?: string, message?: string, details?: string, status?: number }

const INSERT_ATTEMPTS = 3
const RETRY_DELAY_MS = 200
// PostgREST "no rows" (.single()) and Postgres invalid_text_representation
// (malformed uuid): both mean "there is no such post".
const NOT_FOUND_CODES = ["PGRST116", "22P02"]

/**
 * Tells whether a database or network error is worth retrying: gateway
 * statuses (502/503/504), timeout/network/connection messages and common
 * socket error codes.
 *
 * @param error - Error returned by the Supabase client.
 * @returns `true` when the failure looks transient.
 */
export function isTransientError(error: unknown): boolean {
  const raw = error as { message?: unknown, code?: unknown, status?: unknown } | null
  const message = String(raw?.message ?? "").toLowerCase()
  const code = String(raw?.code ?? "").toUpperCase()
  const status = Number(raw?.status ?? 0)

  if ([502, 503, 504].includes(status)) return true

  if (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("network") ||
    message.includes("connection")
  ) {
    return true
  }

  return ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN"].includes(code)
}

/**
 * Tells whether an error is a Postgres unique_violation (SQLSTATE 23505).
 *
 * @param error - Error returned by the Supabase client.
 * @returns `true` for a unique violation.
 */
export function isUniqueViolation(error: unknown): boolean {
  return (error as DbError | null)?.code === "23505"
}

function violatesPrimaryKey(error: unknown): boolean {
  const { message = "", details = "" } = (error as DbError | null) ?? {}

  return `${message} ${details}`.includes("posts_pkey")
}

/**
 * Turns a unique violation into the matching AppError: the primary key means a
 * generated UUID collided; any other constraint (posts_slug_key,
 * posts_title_key) means the title or slug is taken.
 *
 * @param error - Error returned by the Supabase client.
 * @returns `UUID_COLLISION` or `TITLE_OR_SLUG_ALREADY_EXISTS` as an AppError, or
 *   the error unchanged when it is not a unique violation.
 */
export function mapPostWriteError(error: unknown): unknown {
  if (!isUniqueViolation(error)) return error

  return violatesPrimaryKey(error)
    ? appError(POST_ERROR_CODES.UUID_COLLISION)
    : appError(POST_ERROR_CODES.TITLE_OR_SLUG_ALREADY_EXISTS)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Inserts the post, retrying transient failures. After a retry, a primary key
 * violation is our own earlier attempt that did commit (the UUID is freshly
 * generated), so it counts as success.
 *
 * @param post - The row to insert.
 * @throws {AppError} `TITLE_OR_SLUG_ALREADY_EXISTS`, `UUID_COLLISION` or
 *   `TRANSIENT_ERROR_RETRY_FAILED` when every attempt failed transiently;
 *   other database errors are rethrown as they are.
 */
export async function insertPost(post: PostRow): Promise<void> {
  for (let attempt = 0; attempt < INSERT_ATTEMPTS; attempt++) {
    const { error } = await getSupabase().from("posts").insert(post)

    if (!error) return

    if (attempt > 0 && isUniqueViolation(error) && violatesPrimaryKey(error)) return

    if (isTransientError(error)) {
      if (attempt < INSERT_ATTEMPTS - 1) await delay(RETRY_DELAY_MS * (attempt + 1))
      continue
    }

    throw mapPostWriteError(error)
  }

  throw appError(POST_ERROR_CODES.TRANSIENT_ERROR_RETRY_FAILED)
}

/**
 * Updates a post by id. Updating an id that does not exist is not an error.
 *
 * @param id - Post id.
 * @param fields - New column values.
 * @throws {AppError} `TITLE_OR_SLUG_ALREADY_EXISTS` on a unique violation;
 *   other database errors are rethrown as they are.
 */
export async function updatePost(id: string, fields: PostUpdate): Promise<void> {
  const { error } = await getSupabase().from("posts").update(fields).eq("id", id)

  if (error) throw mapPostWriteError(error)
}

/**
 * Finds a post by id.
 *
 * @param id - Post id.
 * @param columns - Columns to select.
 * @returns The requested columns, or `null` when the post does not exist
 *   (including a malformed id).
 * @throws The database error, for failures other than "not found".
 */
export async function findPostById<K extends keyof PostRow>(
  id: string,
  columns: readonly K[]
): Promise<Pick<PostRow, K> | null> {
  const { data, error } = await getSupabase()
    .from("posts")
    .select(columns.join(", "))
    .eq("id", id)
    .maybeSingle()

  if (error) {
    if (NOT_FOUND_CODES.includes(error.code)) return null

    throw error
  }

  return data as unknown as Pick<PostRow, K> | null
}

/**
 * Deletes a post row by id.
 *
 * @param id - Post id.
 * @throws The database error when the delete fails.
 */
export async function deletePostById(id: string): Promise<void> {
  const { error } = await getSupabase().from("posts").delete().eq("id", id)

  if (error) throw error
}

/**
 * Lists post cards, newest first.
 *
 * @param includeInactive - Include inactive posts when `true`.
 * @returns The card rows.
 * @throws The database error when the query fails.
 */
export async function listPostCards(includeInactive: boolean): Promise<PostCardRow[]> {
  let query = getSupabase()
    .from("posts")
    .select(POST_CARD_COLUMNS.join(", "))
    .order("created_at", { ascending: false })

  if (!includeInactive) {
    query = query.eq("active", true)
  }

  const { data, error } = await query

  if (error) throw error

  return (data ?? []) as unknown as PostCardRow[]
}
