/*
 * Edge Function update_post. PUT, multipart form with the post id, admin password
 * required. Replaces the post fields and images and answers
 * { success, message: POST_UPDATED, id }; replaced files are removed afterwards.
 */
import "@supabase/functions-js/edge-runtime.d.ts"
import { POST_ERROR_CODES } from "@shared/contracts/postErrorCodes.ts"
import { POST_SUCCESS_CODES } from "@shared/contracts/postSuccessCodes.ts"
import { appError } from "../_lib/errors.ts"
import { createHandler, jsonResponse, readFormData } from "../_lib/http.ts"
import { replaceImagePaths } from "../_lib/images.ts"
import { parseUpdatePostForm } from "../_lib/postForm.ts"
import { uploadBanner, uploadContentImages } from "../_lib/postImages.ts"
import { findPostById, updatePost } from "../_lib/postsRepository.ts"
import { requireSlug } from "../_lib/slug.ts"
import { listPostFilePaths, removeFilesQuietly } from "../_lib/storage.ts"

Deno.serve(createHandler({ methods: ["PUT"], requireAdmin: true }, async ({ req, config, jsonHeaders }) => {
  const form = parseUpdatePostForm(await readFormData(req), config.categories)
  const { id } = form
  const bucket = config.postsBucket

  const existingPost = await findPostById(id, ["id", "banner_path"])

  if (!existingPost) {
    throw appError(POST_ERROR_CODES.POST_NOT_FOUND)
  }

  const slug = requireSlug(form.title)

  const existingPaths = await listPostFilePaths(bucket, id)
  const existingSet = new Set(existingPaths)
  const uploadedPaths: string[] = []
  let bannerPath = existingPost.banner_path
  let contentPaths: Record<string, string>

  try {
    // upsert: re-sent images keep their path and overwrite the old object.
    const upload = {
      upsert: true,
      mapErrors: false,
      onUploaded: (path: string) => uploadedPaths.push(path)
    }

    if (form.banner) {
      bannerPath = await uploadBanner(bucket, id, form.banner, upload)
    }

    contentPaths = await uploadContentImages(bucket, id, form.images, upload)

    await updatePost(id, {
      post_type: form.category,
      title: form.title,
      slug,
      banner_path: bannerPath,
      preview: form.preview,
      content_markdown: replaceImagePaths(form.contentMarkdown, contentPaths),
      active: form.active
    })
  } catch (error) {
    // Only remove what this request created: overwritten objects pre-existed.
    const created = uploadedPaths.filter((path) => !existingSet.has(path))

    await removeFilesQuietly(bucket, created, "update_post rollback")

    throw error
  }

  // The row is committed and references the new files, so removing the
  // replaced ones is best-effort and can no longer fail the request.
  const keepPaths = new Set<string>([bannerPath, ...Object.values(contentPaths)])
  const obsoletePaths = existingPaths.filter((path) => !keepPaths.has(path))

  await removeFilesQuietly(bucket, obsoletePaths, "update_post replaced files")

  return jsonResponse(
    { success: true, message: POST_SUCCESS_CODES.POST_UPDATED, id },
    jsonHeaders
  )
}))
