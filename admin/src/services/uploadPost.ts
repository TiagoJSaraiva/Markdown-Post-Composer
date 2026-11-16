/*
 * Calls the create_post Edge Function. Used by the save flow (useSavePost).
 */
import { functionUrl } from "../lib/edgeFunctionsPaths"
import { buildAdminHeaders, buildPostFormData, handleRequest } from "@mdpc/shared/services/requestHelpers.ts"
import type { UploadPostServiceParams } from "@mdpc/shared/types/post.ts"

/**
 * Creates a post (multipart form).
 *
 * @param params - Post fields, images, banner and the admin password.
 * @returns The `handleRequest` result: HTTP status and parsed body (status 0 on network failure).
 */
export default async function uploadPostService({ password, ...params }: UploadPostServiceParams) {
  return handleRequest(fetch(functionUrl("create_post"), {
    method: "POST",
    headers: buildAdminHeaders(password),
    body: buildPostFormData(params)
  }))
}
