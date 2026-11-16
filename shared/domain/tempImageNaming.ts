/*
 * Naming scheme of temp images: `<name>__v__<token>.<ext>` with a version token
 * for cache busting. Used by temp_images and the admin.
 */
/** Separates the display name from the version token in a temp file name. */
export const TEMP_IMAGE_VERSION_SEPARATOR = "__v__"

/**
 * Splits a file name at its last dot. Names without a usable dot (none, leading
 * or trailing) have an empty extension.
 *
 * @param fileName - File name.
 * @returns The name without extension and the extension without the dot.
 */
export function splitFileName(fileName: string): { baseName: string; extension: string } {
  const dotIndex = fileName.lastIndexOf(".")

  if (dotIndex <= 0 || dotIndex === fileName.length - 1) {
    return { baseName: fileName, extension: "" }
  }

  return {
    baseName: fileName.slice(0, dotIndex),
    extension: fileName.slice(dotIndex + 1),
  }
}

/**
 * Returns the last segment of a storage path.
 *
 * @param path - Object path.
 * @returns The file name.
 */
export function getStorageFileName(path: string): string {
  return path.split("/").pop() ?? ""
}

/**
 * Normalizes a user-given image name: spaces become `_`, characters other than
 * letters, digits, `_` and `-` are dropped, and the result is lower-case.
 *
 * @param value - Raw name.
 * @returns The normalized name, possibly empty.
 */
export function normalizeImageName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .toLowerCase()
}

/**
 * Creates a version token from the current time and a random suffix.
 *
 * @returns A new token such as `1731700000000_k3j9xa`.
 */
export function createVersionToken(): string {
  const random = Math.random().toString(36).slice(2, 8)
  return `${Date.now()}_${random}`
}

/**
 * Strips the `__v__<token>` suffix from a base name.
 *
 * @param baseName - File name without extension.
 * @returns The name without the version suffix.
 */
export function removeVersionSuffix(baseName: string): string {
  const index = baseName.lastIndexOf(TEMP_IMAGE_VERSION_SEPARATOR)

  return index < 0 ? baseName : baseName.slice(0, index)
}

/**
 * Reads the version token of a base name.
 *
 * @param baseName - File name without extension.
 * @returns The token, or `null` when there is none.
 */
export function extractVersionToken(baseName: string): string | null {
  const index = baseName.lastIndexOf(TEMP_IMAGE_VERSION_SEPARATOR)

  if (index < 0) {
    return null
  }

  return baseName.slice(index + TEMP_IMAGE_VERSION_SEPARATOR.length) || null
}

/**
 * Gets the display name (no version suffix, no extension) of a temp storage path.
 *
 * @param path - Object path in the temp bucket.
 * @returns The display name.
 */
export function getDisplayNameFromPath(path: string): string {
  const { baseName } = splitFileName(getStorageFileName(path))
  return removeVersionSuffix(baseName)
}

/**
 * Gets the version token of a temp storage path.
 *
 * @param path - Object path in the temp bucket.
 * @returns The token, or "legacy" for files without one.
 */
export function getVersionTokenFromPath(path: string): string {
  const { baseName } = splitFileName(getStorageFileName(path))
  return extractVersionToken(baseName) || "legacy"
}

/**
 * Builds `<normalized-name>__v__<token>.<ext>`.
 *
 * @param name - Display name; normalized, with an `img_<timestamp>` fallback when empty.
 * @param extension - Extension without the dot; omitted from the result when empty.
 * @param versionToken - Token to keep (rename); a new one is created when omitted.
 * @returns The file name.
 */
export function buildTempFileName(name: string, extension: string, versionToken?: string): string {
  const normalized = normalizeImageName(name) || `img_${Date.now()}`
  const token = versionToken || createVersionToken()
  const versioned = `${normalized}${TEMP_IMAGE_VERSION_SEPARATOR}${token}`

  return extension ? `${versioned}.${extension}` : versioned
}

/**
 * Appends the `v=<token>` cache-busting parameter to a public URL.
 *
 * @param publicUrl - Public URL of the object.
 * @param path - Object path, the source of the token.
 * @returns The URL with the parameter.
 */
export function withVersionParam(publicUrl: string, path: string): string {
  const separator = publicUrl.includes("?") ? "&" : "?"
  return `${publicUrl}${separator}v=${encodeURIComponent(getVersionTokenFromPath(path))}`
}
