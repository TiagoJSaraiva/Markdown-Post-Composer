/*
 * Edge Function load_cards. GET, public for active posts; ?include_inactive=true
 * requires the admin password. Answers { success, data: PostCard[] }, newest first.
 */
import "@supabase/functions-js/edge-runtime.d.ts"
import type { LoadCardsSuccessResponse, PostCard } from "@shared/contracts/loadCards.ts"
import { assertAdminPassword } from "../_lib/auth.ts"
import { createHandler, jsonResponse } from "../_lib/http.ts"
import { listPostCards } from "../_lib/postsRepository.ts"
import { getPublicUrl } from "../_lib/storage.ts"

Deno.serve(createHandler({ methods: ["GET"] }, async ({ req, config, jsonHeaders }) => {
  const includeInactive = new URL(req.url).searchParams.get("include_inactive") === "true"

  // Inactive posts are private: only the public (active) list is open.
  if (includeInactive) {
    await assertAdminPassword(req, config)
  }

  const posts = await listPostCards(includeInactive)

  const cards: PostCard[] = posts.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    preview: post.preview,
    post_type: post.post_type,
    active: post.active,
    banner_url: getPublicUrl(config.postsBucket, post.banner_path, config.publicStorageUrl)
  }))

  const payload: LoadCardsSuccessResponse = { success: true, data: cards }

  return jsonResponse(payload, jsonHeaders)
}))
