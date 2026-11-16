import "@supabase/functions-js/edge-runtime.d.ts"
import { POST_ERROR_CODES } from "@shared/contracts/postErrorCodes.ts"
import type { LoadPostSuccessResponse, PostDetails } from "@shared/contracts/loadPost.ts"
import { appError } from "../_lib/errors.ts"
import { createHandler, jsonResponse } from "../_lib/http.ts"
import { POST_DETAIL_COLUMNS, findPostById } from "../_lib/postsRepository.ts"
import { getPublicUrl, listPostFilePaths } from "../_lib/storage.ts"

Deno.serve(createHandler({ methods: ["GET"] }, async ({ req, config, jsonHeaders }) => {
  const id = new URL(req.url).searchParams.get("id")

  if (!id) {
    throw appError(POST_ERROR_CODES.INVALID_ID)
  }

  const post = await findPostById(id, POST_DETAIL_COLUMNS)

  if (!post) {
    throw appError(POST_ERROR_CODES.POST_NOT_FOUND)
  }

  const bucket = config.postsBucket
  const filePaths = await listPostFilePaths(bucket, post.id)

  const details: PostDetails = {
    id: post.id,
    post_type: post.post_type,
    title: post.title,
    preview: post.preview,
    active: post.active,
    slug: post.slug,
    banner_path: post.banner_path,
    banner_url: getPublicUrl(bucket, post.banner_path),
    content_markdown: post.content_markdown,
    image_paths: filePaths.filter((path) => path !== post.banner_path)
  }

  const payload: LoadPostSuccessResponse = { success: true, data: details }

  return jsonResponse(payload, jsonHeaders)
}))
