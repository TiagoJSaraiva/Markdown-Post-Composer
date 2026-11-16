import "@supabase/functions-js/edge-runtime.d.ts"
import type { LoadCardsSuccessResponse, PostCard } from "@shared/contracts/loadCards.ts"
import { checkAdminPassword } from "../_lib/auth.ts"
import { getConfig } from "../_lib/config.ts"
import { ERROR_MESSAGES } from "../_lib/errorMessages.ts"
import { errorResponse, internalErrorResponse, prepareRequest } from "../_lib/http.ts"
import { supabase } from "../_lib/supabaseClient.ts"

Deno.serve(async (req) => {

  const context = prepareRequest(req)

  if (context instanceof Response) {
    return context
  }

  const { config, jsonHeaders } = context

  try {

    if (req.method !== "GET") {
      return errorResponse(ERROR_MESSAGES.METHOD_NOT_ALLOWED, 405, jsonHeaders)
    }

    const url = new URL(req.url)
    const includeInactive = url.searchParams.get("include_inactive") === "true"

    if (includeInactive) {
      const passwordError = await checkAdminPassword(req, config, jsonHeaders)

      if (passwordError) {
        return passwordError
      }
    }

    const cardsQuery = supabase
      .from("posts")
      .select("id, title, slug, preview, banner_path, post_type, active")
      .order("created_at", { ascending: false })

    if (!includeInactive) {
      cardsQuery.eq("active", true)
    }

    const { data: posts, error } = await cardsQuery

    if (error) throw error

    const cards: PostCard[] = (posts ?? []).map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      preview: post.preview,
      post_type: post.post_type,
      active: post.active,
      banner_url: buildPublicUrl(post.banner_path)
    }))

    const payload: LoadCardsSuccessResponse = {
      success: true,
      data: cards,
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
