import { functionUrl } from "../lib/edgeFunctionsPaths"
import { buildAdminHeaders, buildPostFormData, handleRequest } from "@mdpc/shared/services/requestHelpers.ts"
import type { UpdatePostServiceParams } from "@mdpc/shared/types/post.ts"

export default async function updatePostService({ password, ...params }: UpdatePostServiceParams) {
  return handleRequest(fetch(functionUrl("update_post"), {
    method: "PUT",
    headers: buildAdminHeaders(password),
    body: buildPostFormData(params)
  }))
}
