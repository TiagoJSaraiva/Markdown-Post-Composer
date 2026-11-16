/*
 * Thin wrapper over Supabase Storage (upload, list, move, copy, remove, public
 * URL) with error classification. Used by the post handlers and temp_images.
 */
import { imageTooLarge, invalidImageType } from "./errors.ts"
import { getSupabase } from "./supabaseClient.ts"

const LIST_PAGE_SIZE = 100
const REMOVE_CHUNK_SIZE = 100

/** An entry returned by Storage listings. */
export type StorageObject = {
  name: string
  /** `null` for folders. */
  id: string | null
}

/** Options of uploadFile. */
export type UploadOptions = {
  /** Overwrite an existing object (default false). */
  upsert?: boolean
  /**
   * Translate "mime type" / "size limit" rejections from Storage into
   * INVALID_IMAGE_TYPE / IMAGE_TOO_LARGE (default true).
   */
  mapErrors?: boolean
  /** Content type to store; defaults to the one Storage infers. */
  contentType?: string
}

function storageStatus(error: unknown): number {
  const raw = error as { status?: unknown, statusCode?: unknown } | null
  const status = Number(raw?.statusCode ?? raw?.status ?? 0)

  return Number.isFinite(status) ? status : 0
}

function storageMessage(error: unknown): string {
  return String((error as { message?: unknown } | null)?.message ?? "").toLowerCase()
}

/**
 * Tells whether a Storage error means the object does not exist.
 *
 * @param error - Error returned by Storage.
 * @returns `true` for a 404 or a "not found" message.
 */
export function isStorageNotFound(error: unknown): boolean {
  return storageStatus(error) === 404 || storageMessage(error).includes("not found")
}

/**
 * Tells whether a Storage error means the object already exists.
 *
 * @param error - Error returned by Storage.
 * @returns `true` for a 409, "already exists" or "duplicate" message.
 */
export function isStorageConflict(error: unknown): boolean {
  const message = storageMessage(error)

  return storageStatus(error) === 409 || message.includes("already exists") || message.includes("duplicate")
}

/**
 * Builds the public URL of an object (the bucket must be public).
 *
 * @param bucket - Bucket name.
 * @param path - Object path.
 * @returns The public URL.
 */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = getSupabase().storage.from(bucket).getPublicUrl(path)

  return data.publicUrl
}

/**
 * Uploads a file to Storage.
 *
 * @param bucket - Bucket name.
 * @param path - Destination object path.
 * @param file - File to upload.
 * @param options - Upload options.
 * @throws {AppError} `INVALID_IMAGE_TYPE` or `IMAGE_TOO_LARGE` when `mapErrors`
 *   is on and Storage rejects the file; any other Storage error is rethrown.
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
  options: UploadOptions = {}
): Promise<void> {
  const { upsert = false, mapErrors = true, contentType } = options

  const { error } = await getSupabase()
    .storage
    .from(bucket)
    .upload(path, file, contentType ? { upsert, contentType } : { upsert })

  if (!error) return

  if (mapErrors) {
    const message = storageMessage(error)

    if (message.includes("mime") || message.includes("content type")) {
      throw invalidImageType(file.name)
    }

    if (message.includes("size") && (message.includes("limit") || message.includes("exceed"))) {
      throw imageTooLarge(file.name)
    }
  }

  throw error
}

/**
 * Removes objects in chunks. Best-effort callers must catch the error or use
 * removeFilesQuietly.
 *
 * @param bucket - Bucket name.
 * @param paths - Object paths to remove.
 * @returns How many objects Storage deleted.
 * @throws The Storage error when a removal fails.
 */
export async function removeFiles(bucket: string, paths: string[]): Promise<number> {
  let deleted = 0

  for (let i = 0; i < paths.length; i += REMOVE_CHUNK_SIZE) {
    const { data, error } = await getSupabase()
      .storage
      .from(bucket)
      .remove(paths.slice(i, i + REMOVE_CHUNK_SIZE))

    if (error) throw error

    deleted += data?.length ?? 0
  }

  return deleted
}

/**
 * Best-effort removal for cleanups that must never fail the request: errors are logged.
 *
 * @param bucket - Bucket name.
 * @param paths - Object paths to remove.
 * @param context - Label included in the log message.
 */
export async function removeFilesQuietly(bucket: string, paths: string[], context: string): Promise<void> {
  try {
    await removeFiles(bucket, paths)
  } catch (error) {
    console.error(`Failed to remove files (${context})`, error)
  }
}

/**
 * Lists every object directly under a folder, page by page.
 *
 * @param bucket - Bucket name.
 * @param folder - Folder path, or "" for the bucket root.
 * @returns All entries, sorted by name.
 * @throws The Storage error when a listing fails.
 */
export async function listAllObjects(bucket: string, folder: string): Promise<StorageObject[]> {
  const objects: StorageObject[] = []
  let offset = 0

  while (true) {
    const { data, error } = await getSupabase()
      .storage
      .from(bucket)
      .list(folder, {
        limit: LIST_PAGE_SIZE,
        offset,
        sortBy: { column: "name", order: "asc" }
      })

    if (error) throw error

    if (!data || data.length === 0) break

    objects.push(...data)

    if (data.length < LIST_PAGE_SIZE) break

    offset += LIST_PAGE_SIZE
  }

  return objects
}

/**
 * Lists everything stored for a post.
 *
 * @param bucket - Posts bucket.
 * @param postId - Post id (the folder name).
 * @returns Full object paths (`<postId>/<file>`).
 * @throws The Storage error when the listing fails.
 */
export async function listPostFilePaths(bucket: string, postId: string): Promise<string[]> {
  const objects = await listAllObjects(bucket, postId)

  return objects
    .filter((item) => item.name && !item.name.endsWith("/"))
    .map((item) => `${postId}/${item.name}`)
}

/**
 * Moves (renames) an object inside a bucket.
 *
 * @param bucket - Bucket name.
 * @param from - Current path.
 * @param to - New path.
 * @throws The Storage error when the move fails.
 */
export async function moveFile(bucket: string, from: string, to: string): Promise<void> {
  const { error } = await getSupabase().storage.from(bucket).move(from, to)

  if (error) throw error
}

/**
 * Copies an object, possibly into another bucket.
 *
 * @param sourceBucket - Bucket of the source object.
 * @param sourcePath - Source object path.
 * @param destinationBucket - Bucket of the copy.
 * @param destinationPath - Path of the copy.
 * @throws The Storage error when the copy fails.
 */
export async function copyFile(
  sourceBucket: string,
  sourcePath: string,
  destinationBucket: string,
  destinationPath: string
): Promise<void> {
  const { error } = await getSupabase()
    .storage
    .from(sourceBucket)
    .copy(sourcePath, destinationPath, { destinationBucket })

  if (error) throw error
}
