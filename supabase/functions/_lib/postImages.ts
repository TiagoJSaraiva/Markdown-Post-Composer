/*
 * Uploads the banner and content images of a post to Storage, validating them
 * first. Used by create_post and update_post; builds on images.ts and storage.ts.
 */
import { buildBannerPath, planContentImages, validateImageFile } from "./images.ts"
import { uploadFile } from "./storage.ts"

/** Options of the post image uploads; `upsert` and `mapErrors` are passed to uploadFile. */
export type PostUploadOptions = {
  upsert?: boolean
  mapErrors?: boolean
  /**
   * Receives every path right after it is uploaded, so the caller can remove
   * partial uploads when a later step fails.
   */
  onUploaded?: (path: string) => void
}

/**
 * Validates and uploads a banner under a fresh versioned path.
 *
 * @param bucket - Posts bucket.
 * @param postId - Post id.
 * @param banner - Banner file.
 * @param options - Upload options.
 * @returns The storage path of the banner.
 * @throws {AppError} Image validation errors, or the Storage error.
 */
export async function uploadBanner(
  bucket: string,
  postId: string,
  banner: File,
  options: PostUploadOptions = {}
): Promise<string> {
  validateImageFile(banner)

  const path = buildBannerPath(postId, banner)

  await uploadFile(bucket, path, banner, options)
  options.onUploaded?.(path)

  return path
}

/**
 * Uploads the content images. All files are validated before the first upload.
 *
 * @param bucket - Posts bucket.
 * @param postId - Post id.
 * @param files - Content image files.
 * @param options - Upload options.
 * @returns `{ key: path }`, ready for replaceImagePaths.
 * @throws {AppError} Image validation errors, or the Storage error.
 */
export async function uploadContentImages(
  bucket: string,
  postId: string,
  files: File[],
  options: PostUploadOptions = {}
): Promise<Record<string, string>> {
  const paths: Record<string, string> = {}

  for (const image of planContentImages(postId, files)) {
    await uploadFile(bucket, image.path, image.file, options)
    options.onUploaded?.(image.path)

    paths[image.key] = image.path
  }

  return paths
}
