/*
 * Edge Function create_post. POST, multipart form, admin password required.
 * Uploads banner and images, inserts the post and answers
 * { success, message: POST_CREATED, id }. Uploaded files are removed if a later step fails.
 */
import "@supabase/functions-js/edge-runtime.d.ts"
import { POST_SUCCESS_CODES } from "@shared/contracts/postSuccessCodes.ts"
import { createHandler, jsonResponse, readFormData } from "../_lib/http.ts"
import { replaceImagePaths } from "../_lib/images.ts"
import { parseCreatePostForm } from "../_lib/postForm.ts"
import { uploadBanner, uploadContentImages } from "../_lib/postImages.ts"
import { insertPost } from "../_lib/postsRepository.ts"
import { requireSlug } from "../_lib/slug.ts"
import { removeFilesQuietly } from "../_lib/storage.ts"

Deno.serve(createHandler({ methods: ["POST"], requireAdmin: true }, async ({ req, config, jsonHeaders }) => {
  const form = parseCreatePostForm(await readFormData(req), config.categories)
  const slug = requireSlug(form.title)
  const postId = crypto.randomUUID()
  const bucket = config.postsBucket
  const uploadedPaths: string[] = []

  try {
    const upload = { onUploaded: (path: string) => uploadedPaths.push(path) }

    const bannerPath = await uploadBanner(bucket, postId, form.banner, upload)
    const contentPaths = await uploadContentImages(bucket, postId, form.images, upload)

    await insertPost({
      id: postId,
      post_type: form.category,
      title: form.title,
      slug,
      banner_path: bannerPath,
      preview: form.preview,
      content_markdown: replaceImagePaths(form.contentMarkdown, contentPaths),
      active: form.active
    })

    return jsonResponse(
      { success: true, message: POST_SUCCESS_CODES.POST_CREATED, id: postId },
      jsonHeaders
    )
  } catch (error) {
    await removeFilesQuietly(bucket, uploadedPaths, "create_post rollback")

    throw error
  }
}))
