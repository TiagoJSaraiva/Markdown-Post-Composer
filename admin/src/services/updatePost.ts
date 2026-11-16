/*
 * Calls the update_post Edge Function. Used by the save flow (useSavePost).
 */
import { functionUrl } from "../lib/edgeFunctionsPaths"
import { buildAdminHeaders, buildPostFormData, handleRequest } from "@mdpc/shared/services/requestHelpers.ts"
import type { UpdatePostServiceParams } from "@mdpc/shared/types/post.ts"

/**
 * Updates a published post (multipart form).
 *
 * @param params - Post fields, images, banner and the admin password.
 * @returns The `handleRequest` result: HTTP status and parsed body (status 0 on network failure).
 */
export default async function updatePostService({ password, ...params }: UpdatePostServiceParams) {
  return handleRequest(fetch(functionUrl("update_post"), {
    method: "PUT",
    headers: buildAdminHeaders(password),
    body: buildPostFormData(params)
  }))
}
