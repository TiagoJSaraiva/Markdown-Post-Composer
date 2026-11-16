/*
 * Calls the delete_post Edge Function. Used by the delete flow (useDeletePost).
 */
import { functionUrl } from "../lib/edgeFunctionsPaths"
import { buildAdminHeaders, handleRequest } from "@mdpc/shared/services/requestHelpers.ts"

/**
 * Deletes a published post.
 *
 * @param id - Post id.
 * @param password - Admin password.
 * @returns The `handleRequest` result: HTTP status and parsed body (status 0 on network failure).
 */
export default async function deletePostService(id: string, password: string) {
  return handleRequest(fetch(functionUrl("delete_post"), {
    method: "DELETE",
    headers: buildAdminHeaders(password, { "Content-Type": "application/json" }),
    body: JSON.stringify({ id })
  }))
}
