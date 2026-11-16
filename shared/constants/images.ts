/*
 * Image upload limits shared by the Edge Functions and the admin
 * (keep in sync with the bucket limits in the SQL migration).
 */
/** MIME types accepted for post and temp images. */
export const ACCEPTED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
/** File extensions accepted for images, lower-case with the leading dot. */
export const ACCEPTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"]
/** Maximum size of an uploaded image, in megabytes. */
export const MAX_IMAGE_MB = 10
/** Maximum size of an uploaded image, in bytes. */
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024
