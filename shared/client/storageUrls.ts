export type StorageUrlOptions = {
  /** e.g. https://<ref>.supabase.co/storage/v1/object/public */
  storagePublicUrl: string
  bucket: string
}

export function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "")
}

export function normalizeStoragePath(path: string, bucket: string): string {
  const trimmed = path.trim().replace(/^['"]|['"]$/g, "")
  const withoutDotPrefix = trimmed.replace(/^\.\//, "")
  const withoutLeadingSlash = withoutDotPrefix.replace(/^\//, "")

  if (bucket && withoutLeadingSlash.startsWith(`${bucket}/`)) {
    return withoutLeadingSlash.slice(bucket.length + 1)
  }

  return withoutLeadingSlash
}

export function encodePathSegments(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/")
}

export function isAbsoluteOrSpecialUrl(url: string): boolean {
  return /^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(url) ||
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.startsWith("mailto:") ||
    url.startsWith("tel:") ||
    url.startsWith("#")
}

/** Builds the public Storage URL for a path. Returns the input unchanged when it cannot be resolved. */
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

/** Resolves a Markdown asset URL: absolute/special URLs are untouched, relative paths become public Storage URLs. */
export function resolveMarkdownAssetUrl(url: string, options: StorageUrlOptions): string {
  if (!url || isAbsoluteOrSpecialUrl(url)) {
    return url
  }

  return buildStoragePublicUrl(url, options)
}
