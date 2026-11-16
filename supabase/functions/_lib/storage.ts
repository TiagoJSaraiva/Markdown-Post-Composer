import { imageTooLarge, invalidImageType } from "./errors.ts"
import { getSupabase } from "./supabaseClient.ts"

const LIST_PAGE_SIZE = 100
const REMOVE_CHUNK_SIZE = 100

export type StorageObject = {
  name: string
  id: string | null
}

export type UploadOptions = {
  upsert?: boolean
  // Translate "mime type" / "size limit" rejections from Storage into
  // INVALID_IMAGE_TYPE / IMAGE_TOO_LARGE (default true).
  mapErrors?: boolean
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

export function isStorageNotFound(error: unknown): boolean {
  return storageStatus(error) === 404 || storageMessage(error).includes("not found")
}

export function isStorageConflict(error: unknown): boolean {
  const message = storageMessage(error)

  return storageStatus(error) === 409 || message.includes("already exists") || message.includes("duplicate")
}

export function getPublicUrl(bucket: string, path: string): string {
  const { data } = getSupabase().storage.from(bucket).getPublicUrl(path)

  return data.publicUrl
}

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

// Removes the paths in chunks and returns how many objects Storage deleted.
// Throws the Storage error, so best-effort callers must catch it (or use
// removeFilesQuietly).
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

// Best-effort removal for cleanups that must never fail the request: errors are logged.
export async function removeFilesQuietly(bucket: string, paths: string[], context: string): Promise<void> {
  try {
    await removeFiles(bucket, paths)
  } catch (error) {
    console.error(`Failed to remove files (${context})`, error)
  }
}

// Lists every object directly under `folder` ("" for the bucket root), page by page.
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

// Full paths (`<postId>/<file>`) of everything stored for a post.
export async function listPostFilePaths(bucket: string, postId: string): Promise<string[]> {
  const objects = await listAllObjects(bucket, postId)

  return objects
    .filter((item) => item.name && !item.name.endsWith("/"))
    .map((item) => `${postId}/${item.name}`)
}

export async function moveFile(bucket: string, from: string, to: string): Promise<void> {
  const { error } = await getSupabase().storage.from(bucket).move(from, to)

  if (error) throw error
}

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
