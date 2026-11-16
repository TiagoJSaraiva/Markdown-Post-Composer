import { functionUrl } from "../lib/edgeFunctionsPaths"
import { buildAdminHeaders, handleRequest } from "@mdpc/shared/services/requestHelpers.ts"

export default async function deletePostService(id: string, password: string) {
  return handleRequest(fetch(functionUrl("delete_post"), {
    method: "DELETE",
    headers: buildAdminHeaders(password, { "Content-Type": "application/json" }),
    body: JSON.stringify({ id })
  }))
}
