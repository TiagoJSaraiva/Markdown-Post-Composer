export const DEFAULT_POST_IMAGES_BUCKET = "post-images"
export const DEFAULT_TEMP_BUCKET = "temp"

export function resolveBucketName(rawBucket: string | null | undefined, fallback: string): string {
  const normalized = rawBucket?.trim()

  return normalized ? normalized : fallback
}

export function resolvePostImagesBucket(rawBucket?: string | null): string {
  return resolveBucketName(rawBucket, DEFAULT_POST_IMAGES_BUCKET)
}

export function resolveTempBucket(rawBucket?: string | null): string {
  return resolveBucketName(rawBucket, DEFAULT_TEMP_BUCKET)
}
