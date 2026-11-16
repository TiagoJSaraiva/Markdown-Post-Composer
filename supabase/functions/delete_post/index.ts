import "@supabase/functions-js/edge-runtime.d.ts"
import type { DeletePostRequestBody } from "@shared/contracts/deletePost.ts"
import { supabase } from "../_lib/supabaseClient.ts"
import {
  deleteFiles,
  listAllPostFiles
} from "../_lib/auxiliaryFunctions.ts"
import { checkAdminPassword } from "../_lib/auth.ts"
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../_lib/errorMessages.ts"
import { errorResponse, internalErrorResponse, prepareRequest } from "../_lib/http.ts"

Deno.serve(async (req) => {

  const context = prepareRequest(req)

  if (context instanceof Response) {
    return context
  }

  const { config, jsonHeaders } = context

  try {

    if (req.method !== "DELETE") {
      return errorResponse(ERROR_MESSAGES.METHOD_NOT_ALLOWED, 405, jsonHeaders)
    }

    const passwordError = await checkAdminPassword(req, config, jsonHeaders)

    if (passwordError) {
      return passwordError
    }

    let body: DeletePostRequestBody | null

    try {
      body = await req.json()
    } catch {
      return errorResponse(ERROR_MESSAGES.INVALID_JSON, 400, jsonHeaders)
    }

    const id = body?.id

    if (!id || typeof id !== "string") {
      return errorResponse(ERROR_MESSAGES.INVALID_ID, 400, jsonHeaders)
    }

    const { data: post, error: fetchError } = await supabase
      .from("posts")
      .select("id")
      .eq("id", id)
      .single()

    if (fetchError || !post) {
      return errorResponse(ERROR_MESSAGES.POST_NOT_FOUND, 404, jsonHeaders)
    }

    const files = await listAllPostFiles(id)
    const paths = files.map(file => `${id}/${file.name}`)

    const { error: deleteError } = await supabase
      .from("posts")
      .delete()
      .eq("id", id)

    if (deleteError) throw deleteError

    // Storage cleanup is best-effort. The source of truth is removing the post row.
    try {
      await deleteFiles(paths)
    } catch (storageError) {
      console.error("Failed to cleanup post files after DB deletion", storageError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: SUCCESS_MESSAGES.POST_DELETED
      }),
      { status: 200, headers: jsonHeaders }
    )

  } catch (err: unknown) {

    return internalErrorResponse(err, jsonHeaders)

  }
})
