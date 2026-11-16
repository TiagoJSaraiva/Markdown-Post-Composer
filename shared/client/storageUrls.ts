/*
 * Helpers that turn Storage paths and Markdown asset URLs into public URLs.
 * Used by postsClient.ts and react/MarkdownRenderer.tsx.
 */
/** Where public Storage objects live. */
export type StorageUrlOptions = {
  /** e.g. https://<ref>.supabase.co/storage/v1/object/public */
  storagePublicUrl: string
  /** Bucket that relative paths belong to. */
  bucket: string
}

/**
 * Removes trailing slashes.
 *
 * @param value - URL or path.
 * @returns The value without trailing slashes.
 */
export function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "")
}

/**
 * Cleans a path found in Markdown: strips quotes, a leading `./` or `/`, and a
 * leading `<bucket>/` segment.
 *
 * @param path - Raw path.
 * @param bucket - Bucket name to strip when the path starts with it.
 * @returns The object path relative to the bucket.
 */
export function normalizeStoragePath(path: string, bucket: string): string {
  const trimmed = path.trim().replace(/^['"]|['"]$/g, "")
  const withoutDotPrefix = trimmed.replace(/^\.\//, "")
  const withoutLeadingSlash = withoutDotPrefix.replace(/^\//, "")

  if (bucket && withoutLeadingSlash.startsWith(`${bucket}/`)) {
    return withoutLeadingSlash.slice(bucket.length + 1)
  }

  return withoutLeadingSlash
}

/**
 * Percent-encodes each segment of a path and drops empty ones.
 *
 * @param path - Slash-separated path.
 * @returns The encoded path.
 */
export function encodePathSegments(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/")
}

/**
 * Tells whether a URL must not be rewritten: absolute or protocol-relative, or a
 * `data:`, `blob:`, `mailto:`, `tel:` or `#` anchor URL.
 *
 * @param url - URL to check.
 * @returns `true` when the URL is absolute or special.
 */
export function isAbsoluteOrSpecialUrl(url: string): boolean {
  return /^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(url) ||
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.startsWith("mailto:") ||
    url.startsWith("tel:") ||
    url.startsWith("#")
}

/**
 * Builds the public Storage URL for a path.
 *
 * @param path - Object path, optionally prefixed with the bucket.
 * @param options - Storage base URL and bucket.
 * @returns The public URL, or `path` unchanged when it cannot be resolved.
 */
export function buildStoragePublicUrl(path: string, options: StorageUrlOptions): string {
  const base = trimTrailingSlashes(options.storagePublicUrl.trim())

  if (!base) {
    return path
  }

  const normalizedPath = normalizeStoragePath(path, options.bucket)

  if (!normalizedPath) {
    return path
  }

  return `${base}/${options.bucket}/${encodePathSegments(normalizedPath)}`
}

/**
 * Resolves a Markdown asset URL: absolute/special URLs are untouched, relative
 * paths become public Storage URLs.
 *
 * @param url - URL found in the Markdown.
 * @param options - Storage base URL and bucket.
 * @returns The URL to use in the rendered page.
 */
export function resolveMarkdownAssetUrl(url: string, options: StorageUrlOptions): string {
  if (!url || isAbsoluteOrSpecialUrl(url)) {
    return url
  }

  return buildStoragePublicUrl(url, options)
}
