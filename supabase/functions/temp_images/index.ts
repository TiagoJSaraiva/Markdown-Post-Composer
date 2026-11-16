import "@supabase/functions-js/edge-runtime.d.ts"
import { ACCEPTED_EXTENSIONS } from "@shared/constants/images.ts"
import {
  isDeleteTempImagesRequestBody,
  isImportPostImageRequestBody,
  isRenameTempImageRequestBody
} from "@shared/contracts/tempImages.ts"
import type {
  DeleteTempImagesSuccessResponse,
  ListTempImagesSuccessResponse,
  TempImage,
  TempImageSuccessResponse
} from "@shared/contracts/tempImages.ts"
import {
  buildTempFileName,
  extractVersionToken,
  getDisplayNameFromPath,
  getStorageFileName,
  normalizeImageName,
  splitFileName,
  withVersionParam
} from "@shared/domain/tempImageNaming.ts"
import { validateImageFile } from "../_lib/auxiliaryFunctions.ts"
import { checkAdminPassword } from "../_lib/auth.ts"
import { getConfig } from "../_lib/config.ts"
import {
  ERROR_MESSAGES,
  invalidImageTypeResponse,
  knownErrorResponse
} from "../_lib/errorMessages.ts"
import { errorResponse, internalErrorResponse, prepareRequest } from "../_lib/http.ts"
import { supabase } from "../_lib/supabaseClient.ts"

const LIST_PAGE_SIZE = 100
const REMOVE_CHUNK_SIZE = 100

Deno.serve(async (req) => {

  const context = prepareRequest(req)

  if (context instanceof Response) {
    return context
  }

  const { config, jsonHeaders } = context

  try {

    if (!["GET", "POST", "PATCH", "DELETE"].includes(req.method)) {
      return errorResponse(ERROR_MESSAGES.METHOD_NOT_ALLOWED, 405, jsonHeaders)
    }

    const passwordError = await checkAdminPassword(req, config, jsonHeaders)

    if (passwordError) {
      return passwordError
    }

    const url = new URL(req.url)
    const action = url.searchParams.get("action")

    if (action !== null && !(req.method === "POST" && action === "import")) {
      return errorResponse(ERROR_MESSAGES.INVALID_ACTION, 400, jsonHeaders)
    }

    switch (req.method) {
      case "GET":
        return await handleList(jsonHeaders)
      case "PATCH":
        return await handleRename(req, jsonHeaders)
      case "DELETE":
        return await handleDelete(req, jsonHeaders)
      default:
        return action === "import"
          ? await handleImport(req, jsonHeaders)
          : await handleUpload(req, jsonHeaders)
    }

  } catch (err: unknown) {

    return knownErrorResponse(err, jsonHeaders) ?? internalErrorResponse(err, jsonHeaders)

  }
})

function jsonResponse(payload: unknown, headers: HeadersInit): Response {
  return new Response(JSON.stringify(payload), { status: 200, headers })
}

function toTempImage(path: string): TempImage {
  const { data } = supabase
    .storage
    .from(getConfig().tempBucket)
    .getPublicUrl(path)

  return {
    name: getDisplayNameFromPath(path),
    path,
    publicUrl: withVersionParam(data.publicUrl, path)
  }
}

function imageResponse(path: string, headers: HeadersInit): Response {
  const payload: TempImageSuccessResponse = { success: true, data: toTempImage(path) }

  return jsonResponse(payload, headers)
}

function storageStatus(error: unknown): number {
  const raw = error as { status?: unknown, statusCode?: unknown } | null
  const status = Number(raw?.statusCode ?? raw?.status ?? 0)

  return Number.isFinite(status) ? status : 0
}

function isNotFoundError(error: unknown): boolean {
  const message = String((error as { message?: unknown } | null)?.message ?? "").toLowerCase()

  return storageStatus(error) === 404 || message.includes("not found")
}

function isConflictError(error: unknown): boolean {
  const message = String((error as { message?: unknown } | null)?.message ?? "").toLowerCase()

  return storageStatus(error) === 409 || message.includes("already exists") || message.includes("duplicate")
}

// Temp images live at the root of the bucket: a path is just a file name.
function isValidTempPath(path: string): boolean {
  return (
    path.length > 0 &&
    path.length <= 255 &&
    path !== "." &&
    path !== ".." &&
    !/[/\\\u0000-\u001f]/.test(path)
  )
}

// Post image paths look like `<post-id>/<file>`; reject anything that could
// escape the bucket layout.
function isValidPostImagePath(path: string): boolean {
  if (path.length === 0 || path.length > 1024 || path.startsWith("/") || /[\\\u0000-\u001f]/.test(path)) {
    return false
  }

  return path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..")
}

async function listAllTempPaths(): Promise<string[]> {
  const paths: string[] = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .storage
      .from(getConfig().tempBucket)
      .list("", { limit: LIST_PAGE_SIZE, offset })

    if (error) throw error

    if (!data || data.length === 0) break

    for (const item of data) {
      // folders have no id; ".emptyFolderPlaceholder" and similar are hidden
      if (item.id && item.name && !item.name.startsWith(".")) {
        paths.push(item.name)
      }
    }

    if (data.length < LIST_PAGE_SIZE) break

    offset += LIST_PAGE_SIZE
  }

  return paths
}

async function handleList(headers: HeadersInit): Promise<Response> {
  const paths = await listAllTempPaths()
  const payload: ListTempImagesSuccessResponse = { success: true, data: paths.map(toTempImage) }

  return jsonResponse(payload, headers)
}

async function handleUpload(req: Request, headers: HeadersInit): Promise<Response> {
  let form: FormData

  try {
    form = await req.formData()
  } catch {
    return errorResponse(ERROR_MESSAGES.INVALID_FORM_DATA, 400, headers)
  }

  const file = form.get("file")
  const name = form.get("name")

  if (!(file instanceof File)) {
    return errorResponse(ERROR_MESSAGES.MISSING_FILE, 400, headers)
  }

  if (name !== null && typeof name !== "string") {
    return errorResponse(ERROR_MESSAGES.INVALID_FORM_DATA, 400, headers)
  }

  validateImageFile(file)

  const { baseName, extension } = splitFileName(file.name)
  const path = buildTempFileName(name?.trim() || baseName, extension)

  const { error } = await supabase
    .storage
    .from(getConfig().tempBucket)
    .upload(path, file, { upsert: false, contentType: file.type })

  if (error) {
    if (isConflictError(error)) {
      return errorResponse(ERROR_MESSAGES.TEMP_IMAGE_ALREADY_EXISTS, 409, headers)
    }

    throw error
  }

  return imageResponse(path, headers)
}

async function handleRename(req: Request, headers: HeadersInit): Promise<Response> {
  let body: unknown

  try {
    body = await req.json()
  } catch {
    return errorResponse(ERROR_MESSAGES.INVALID_JSON, 400, headers)
  }

  if (!isRenameTempImageRequestBody(body) || !isValidTempPath(body.path)) {
    return errorResponse(ERROR_MESSAGES.INVALID_PATH, 400, headers)
  }

  if (!normalizeImageName(body.name)) {
    return errorResponse(ERROR_MESSAGES.INVALID_NAME, 400, headers)
  }

  const currentPath = body.path
  const { baseName, extension } = splitFileName(getStorageFileName(currentPath))
  const keepToken = extractVersionToken(baseName) ?? undefined
  const nextPath = buildTempFileName(body.name, extension, keepToken)

  if (nextPath === currentPath) {
    return imageResponse(currentPath, headers)
  }

  const { error } = await supabase
    .storage
    .from(getConfig().tempBucket)
    .move(currentPath, nextPath)

  if (error) {
    if (isNotFoundError(error)) {
      return errorResponse(ERROR_MESSAGES.TEMP_IMAGE_NOT_FOUND, 404, headers)
    }

    if (isConflictError(error)) {
      return errorResponse(ERROR_MESSAGES.TEMP_IMAGE_ALREADY_EXISTS, 409, headers)
    }

    throw error
  }

  return imageResponse(nextPath, headers)
}

async function handleDelete(req: Request, headers: HeadersInit): Promise<Response> {
  let body: unknown

  try {
    body = await req.json()
  } catch {
    return errorResponse(ERROR_MESSAGES.INVALID_JSON, 400, headers)
  }

  if (!isDeleteTempImagesRequestBody(body)) {
    return errorResponse(ERROR_MESSAGES.INVALID_PATH, 400, headers)
  }

  let paths: string[]

  if ("all" in body) {
    paths = await listAllTempPaths()
  } else if (isValidTempPath(body.path)) {
    paths = [body.path]
  } else {
    return errorResponse(ERROR_MESSAGES.INVALID_PATH, 400, headers)
  }

  let deleted = 0

  for (let i = 0; i < paths.length; i += REMOVE_CHUNK_SIZE) {
    const { data, error } = await supabase
      .storage
      .from(getConfig().tempBucket)
      .remove(paths.slice(i, i + REMOVE_CHUNK_SIZE))

    if (error) throw error

    deleted += data?.length ?? 0
  }

  const payload: DeleteTempImagesSuccessResponse = { success: true, data: { deleted } }

  return jsonResponse(payload, headers)
}

async function handleImport(req: Request, headers: HeadersInit): Promise<Response> {
  let body: unknown

  try {
    body = await req.json()
  } catch {
    return errorResponse(ERROR_MESSAGES.INVALID_JSON, 400, headers)
  }

  if (!isImportPostImageRequestBody(body) || !isValidPostImagePath(body.postImagePath)) {
    return errorResponse(ERROR_MESSAGES.INVALID_PATH, 400, headers)
  }

  const sourcePath = body.postImagePath
  const sourceName = getStorageFileName(sourcePath)
  const { extension } = splitFileName(sourceName)

  if (!ACCEPTED_EXTENSIONS.includes(`.${extension}`.toLowerCase())) {
    return invalidImageTypeResponse(sourceName, headers)
  }

  const { postsBucket, tempBucket } = getConfig()
  const path = buildTempFileName(getDisplayNameFromPath(sourcePath), extension)

  const { error } = await supabase
    .storage
    .from(postsBucket)
    .copy(sourcePath, path, { destinationBucket: tempBucket })

  if (error) {
    if (isNotFoundError(error)) {
      return errorResponse(ERROR_MESSAGES.POST_IMAGE_NOT_FOUND, 404, headers)
    }

    throw error
  }

  return imageResponse(path, headers)
}
