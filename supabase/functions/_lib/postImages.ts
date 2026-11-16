import { buildBannerPath, planContentImages, validateImageFile } from "./images.ts"
import { uploadFile } from "./storage.ts"

export type PostUploadOptions = {
  upsert?: boolean
  mapErrors?: boolean
  // Receives every path right after it is uploaded, so the caller can remove
  // partial uploads when a later step fails.
  onUploaded?: (path: string) => void
}

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

// Uploads the content images and returns `{ key: path }` for the markdown
// replacement. All files are validated before the first upload.
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
