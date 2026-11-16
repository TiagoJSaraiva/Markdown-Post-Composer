/*
 * Default Storage bucket names and resolution of the MDPC_*_BUCKET overrides.
 */
/** Default bucket for post images (MDPC_POSTS_BUCKET overrides it). */
export const DEFAULT_POST_IMAGES_BUCKET = "post-images"
/** Default bucket for temp images (MDPC_TEMP_BUCKET overrides it). */
export const DEFAULT_TEMP_BUCKET = "temp"

/**
 * Returns the trimmed bucket name, or the fallback when it is empty or missing.
 *
 * @param rawBucket - Raw value, usually an environment variable.
 * @param fallback - Name used when `rawBucket` is blank.
 * @returns The bucket name.
 */
export function resolveBucketName(rawBucket: string | null | undefined, fallback: string): string {
  const normalized = rawBucket?.trim()

  return normalized ? normalized : fallback
}

/**
 * Resolves the posts bucket name.
 *
 * @param rawBucket - Raw MDPC_POSTS_BUCKET value.
 * @returns The configured name, or DEFAULT_POST_IMAGES_BUCKET.
 */
export function resolvePostImagesBucket(rawBucket?: string | null): string {
  return resolveBucketName(rawBucket, DEFAULT_POST_IMAGES_BUCKET)
}

/**
 * Resolves the temp bucket name.
 *
 * @param rawBucket - Raw MDPC_TEMP_BUCKET value.
 * @returns The configured name, or DEFAULT_TEMP_BUCKET.
 */
export function resolveTempBucket(rawBucket?: string | null): string {
  return resolveBucketName(rawBucket, DEFAULT_TEMP_BUCKET)
}
