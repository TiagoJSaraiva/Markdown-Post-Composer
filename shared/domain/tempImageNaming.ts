export const TEMP_IMAGE_VERSION_SEPARATOR = "__v__"

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

export function getStorageFileName(path: string): string {
  return path.split("/").pop() ?? ""
}

export function normalizeImageName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .toLowerCase()
}

export function createVersionToken(): string {
  const random = Math.random().toString(36).slice(2, 8)
  return `${Date.now()}_${random}`
}

export function removeVersionSuffix(baseName: string): string {
  const index = baseName.lastIndexOf(TEMP_IMAGE_VERSION_SEPARATOR)

  return index < 0 ? baseName : baseName.slice(0, index)
}

export function extractVersionToken(baseName: string): string | null {
  const index = baseName.lastIndexOf(TEMP_IMAGE_VERSION_SEPARATOR)

  if (index < 0) {
    return null
  }

  return baseName.slice(index + TEMP_IMAGE_VERSION_SEPARATOR.length) || null
}

// Display name (no version suffix, no extension) of a temp storage path.
export function getDisplayNameFromPath(path: string): string {
  const { baseName } = splitFileName(getStorageFileName(path))
  return removeVersionSuffix(baseName)
}

export function getVersionTokenFromPath(path: string): string {
  const { baseName } = splitFileName(getStorageFileName(path))
  return extractVersionToken(baseName) || "legacy"
}

// Builds `<normalized-name>__v__<token>.<ext>`.
export function buildTempFileName(name: string, extension: string, versionToken?: string): string {
  const normalized = normalizeImageName(name) || `img_${Date.now()}`
  const token = versionToken || createVersionToken()
  const versioned = `${normalized}${TEMP_IMAGE_VERSION_SEPARATOR}${token}`

  return extension ? `${versioned}.${extension}` : versioned
}

export function withVersionParam(publicUrl: string, path: string): string {
  const separator = publicUrl.includes("?") ? "&" : "?"
  return `${publicUrl}${separator}v=${encodeURIComponent(getVersionTokenFromPath(path))}`
}
