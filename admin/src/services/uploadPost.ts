import { functionUrl } from "../lib/edgeFunctionsPaths"
import { buildAdminHeaders, buildPostFormData, handleRequest } from "@mdpc/shared/services/requestHelpers.ts"
import type { UploadPostServiceParams } from "@mdpc/shared/types/post.ts"

export default async function uploadPostService({ password, ...params }: UploadPostServiceParams) {
  return handleRequest(fetch(functionUrl("create_post"), {
    method: "POST",
    headers: buildAdminHeaders(password),
    body: buildPostFormData(params)
  }))
}
