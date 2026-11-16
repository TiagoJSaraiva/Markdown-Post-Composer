import "@supabase/functions-js/edge-runtime.d.ts"

import type { LoadPostSuccessResponse, PostDetails } from "@shared/contracts/loadPost.ts"
import { getConfig } from "../_lib/config.ts"
import { listAllPostFiles } from "../_lib/auxiliaryFunctions.ts"
import { ERROR_MESSAGES } from "../_lib/errorMessages.ts"
import { errorResponse, internalErrorResponse, prepareRequest } from "../_lib/http.ts"
import { supabase } from "../_lib/supabaseClient.ts"

Deno.serve(async (req) => {

  const context = prepareRequest(req)

  if (context instanceof Response) {
    return context
  }

  const { jsonHeaders } = context

  try {

    if (req.method !== "GET") {
      return errorResponse(ERROR_MESSAGES.METHOD_NOT_ALLOWED, 405, jsonHeaders)
    }

    const url = new URL(req.url)
    const id = url.searchParams.get("id")

    if (!id) {
      return errorResponse(ERROR_MESSAGES.INVALID_ID, 400, jsonHeaders)
    }

    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id, post_type, title, slug, banner_path, preview, content_markdown, active")
      .eq("id", id)
      .single()

    if (postError || !post) {
      return errorResponse(ERROR_MESSAGES.POST_NOT_FOUND, 404, jsonHeaders)
    }

    const bannerUrl = buildPublicUrl(post.banner_path)
    const imagePaths = await listPostImagePaths(post.id, post.banner_path)

    const postDetails: PostDetails = {
      id: post.id,
      post_type: post.post_type,
      title: post.title,
      preview: post.preview,
      active: post.active,
      slug: post.slug,
      banner_path: post.banner_path,
      banner_url: bannerUrl,
      content_markdown: post.content_markdown,
      image_paths: imagePaths,
    }

    const payload: LoadPostSuccessResponse = {
      success: true,
      data: postDetails,
    }

    return new Response(
      JSON.stringify(payload),
      {
        status: 200,
        headers: jsonHeaders
      }
    )

  } catch (err: unknown) {

    return internalErrorResponse(err, jsonHeaders)

  }
})

function buildPublicUrl(path: string) {
  const { data } = supabase
    .storage
    .from(getConfig().postsBucket)
    .getPublicUrl(path)

  return data.publicUrl
}

async function listPostImagePaths(postId: string, bannerPath: string): Promise<string[]> {
  const files = await listAllPostFiles(postId)

  return files
    .filter((item) => item.name && !item.name.endsWith("/"))
    .map((item) => `${postId}/${item.name}`)
    .filter((path) => path !== bannerPath)
}
