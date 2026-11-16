/*
 * Pure naming and validation helpers for post images (no storage access).
 * Used by postImages.ts, create_post, update_post and temp_images.
 */
import {
  ACCEPTED_EXTENSIONS,
  ACCEPTED_MIME_TYPES,
  MAX_IMAGE_BYTES
} from "../../../shared/constants/images.ts"
import { POST_ERROR_CODES } from "../../../shared/contracts/postErrorCodes.ts"
import { lookupLocalImage, rewriteImageTargets } from "../../../shared/domain/markdownImageRefs.ts"
import { splitFileName } from "../../../shared/domain/tempImageNaming.ts"
import { appError, imageTooLarge, invalidImageType } from "./errors.ts"

/** A content image ready to upload. */
export type ContentImage = {
  /** File name without extension; what the markdown refers to as `(name)`. */
  key: string
  /** Object path inside the posts bucket: `<postId>/<name>.<ext>`. */
  path: string
  file: File
}

/**
 * Checks the file name extension against ACCEPTED_EXTENSIONS (case-insensitive).
 *
 * @param fileName - File name, with extension.
 * @returns `true` when the extension is accepted.
 */
export function hasAcceptedExtension(fileName: string): boolean {
  const { extension } = splitFileName(fileName)

  return ACCEPTED_EXTENSIONS.includes(`.${extension}`.toLowerCase())
}

/**
 * Validates the extension, MIME type and size of an image.
 *
 * @param file - File to validate.
 * @throws {AppError} `INVALID_IMAGE_TYPE` (extension or MIME type) or `IMAGE_TOO_LARGE`.
 */
export function validateImageFile(file: File): void {
  if (!hasAcceptedExtension(file.name) || !ACCEPTED_MIME_TYPES.includes(file.type)) {
    throw invalidImageType(file.name)
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw imageTooLarge(file.name)
  }
}

function requireExtension(fileName: string): { baseName: string, extension: string } {
  const parts = splitFileName(fileName)

  if (!parts.extension) {
    throw appError(POST_ERROR_CODES.INVALID_EXTENSION)
  }

  return parts
}

/**
 * Builds the storage path of a banner: `<postId>/banner_<version>.<ext>`. The
 * version makes each upload a new object, so caches never serve a stale banner.
 *
 * @param postId - Post id.
 * @param banner - Banner file; its extension is kept.
 * @param version - Cache-busting token (defaults to `Date.now()`).
 * @returns The object path inside the posts bucket.
 * @throws {AppError} `INVALID_EXTENSION` when the file has no extension.
 */
export function buildBannerPath(postId: string, banner: File, version: number = Date.now()): string {
  const { extension } = requireExtension(banner.name)

  return `${postId}/banner_${version}.${extension}`
}

/**
 * Validates every file and derives its key and storage path. The key is the
 * name up to the LAST dot (`my.photo.png` gives `my.photo`).
 *
 * @param postId - Post id, used as the storage folder.
 * @param files - Content image files.
 * @returns One entry per file, in order.
 * @throws {AppError} Any validateImageFile error, `INVALID_EXTENSION`, or
 *   `DUPLICATE_IMAGE_NAME` when two files share a key.
 */
export function planContentImages(postId: string, files: File[]): ContentImage[] {
  const images: ContentImage[] = []
  const usedKeys = new Set<string>()

  for (const file of files) {
    validateImageFile(file)

    const { baseName, extension } = requireExtension(file.name)

    if (usedKeys.has(baseName)) {
      throw appError(POST_ERROR_CODES.DUPLICATE_IMAGE_NAME)
    }

    usedKeys.add(baseName)
    images.push({ key: baseName, path: `${postId}/${baseName}.${extension}`, file })
  }

  return images
}

/**
 * Replaces local image references (`![alt](name)`, `./name`, `name.ext`, with or
 * without a title) by their storage path, following the shared rules in
 * `shared/domain/markdownImageRefs.ts`. Text outside image syntax is untouched,
 * replaced paths are never rescanned and `$` in a path is literal.
 *
 * @param markdown - Post markdown.
 * @param paths - Map of image key (name without extension) to storage path.
 * @returns The markdown with the references replaced.
 * @example
 * replaceImagePaths('![cat](cat) ![dog](./dog.png "Rex")', { cat: "id/cat.png", dog: "id/dog.png" })
 * // '![cat](id/cat.png) ![dog](id/dog.png "Rex")'
 */
export function replaceImagePaths(markdown: string, paths: Record<string, string>): string {
  return rewriteImageTargets(markdown, (target) => lookupLocalImage(target, paths) ?? null)
}
