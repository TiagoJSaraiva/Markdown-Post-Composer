import "@supabase/functions-js/edge-runtime.d.ts"
import { POST_ERROR_CODES } from "@shared/contracts/postErrorCodes.ts"
import { POST_SUCCESS_CODES } from "@shared/contracts/postSuccessCodes.ts"
import { isObjectRecord } from "@shared/utils/objectGuards.ts"
import { appError } from "../_lib/errors.ts"
import { createHandler, jsonResponse, readJsonBody } from "../_lib/http.ts"
import { deletePostById, findPostById } from "../_lib/postsRepository.ts"
import { listPostFilePaths, removeFilesQuietly } from "../_lib/storage.ts"

Deno.serve(createHandler({ methods: ["DELETE"], requireAdmin: true }, async ({ req, config, jsonHeaders }) => {
  const body = await readJsonBody(req)
  const id = isObjectRecord(body) ? body.id : null

  if (!id || typeof id !== "string") {
    throw appError(POST_ERROR_CODES.INVALID_ID)
  }

  if (!(await findPostById(id, ["id"]))) {
    throw appError(POST_ERROR_CODES.POST_NOT_FOUND)
  }

  const paths = await listPostFilePaths(config.postsBucket, id)

  await deletePostById(id)

  // The source of truth is the removed row; leftover files are only logged.
  await removeFilesQuietly(config.postsBucket, paths, "delete_post")

  return jsonResponse({ success: true, message: POST_SUCCESS_CODES.POST_DELETED }, jsonHeaders)
}))
