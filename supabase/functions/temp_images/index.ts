/*
 * Edge Function temp_images. Admin password required on every method.
 * GET lists temp images, POST uploads one (?action=import copies a post image
 * into the temp bucket), PATCH renames, DELETE removes one or all.
 * Answers { success, data } as defined in shared/contracts/tempImages.ts.
 */
import "@supabase/functions-js/edge-runtime.d.ts"
import type {
  DeleteTempImagesSuccessResponse,
  ListTempImagesSuccessResponse,
  TempImage,
  TempImageSuccessResponse
} from "@shared/contracts/tempImages.ts"
import {
  isDeleteTempImagesRequestBody,
  isImportPostImageRequestBody,
  isRenameTempImageRequestBody
} from "@shared/contracts/tempImages.ts"
import { POST_ERROR_CODES } from "@shared/contracts/postErrorCodes.ts"
import {
  buildTempFileName,
  extractVersionToken,
  getDisplayNameFromPath,
  getStorageFileName,
  normalizeImageName,
  splitFileName,
  withVersionParam
} from "@shared/domain/tempImageNaming.ts"
import type { FunctionConfig } from "../_lib/config.ts"
import { appError, invalidImageType } from "../_lib/errors.ts"
import type { HandlerContext } from "../_lib/http.ts"
import { createHandler, jsonResponse, readFormData, readJsonBody } from "../_lib/http.ts"
import { hasAcceptedExtension, validateImageFile } from "../_lib/images.ts"
import {
  copyFile,
  getPublicUrl,
  isStorageConflict,
  isStorageNotFound,
  listAllObjects,
  moveFile,
  removeFiles,
  uploadFile
} from "../_lib/storage.ts"

Deno.serve(createHandler(
  { methods: ["GET", "POST", "PATCH", "DELETE"], requireAdmin: true },
  (context) => {
    const action = new URL(context.req.url).searchParams.get("action")

    if (action !== null && !(context.req.method === "POST" && action === "import")) {
      throw appError(POST_ERROR_CODES.INVALID_ACTION)
    }

    switch (context.req.method) {
      case "GET":
        return handleList(context)
      case "PATCH":
        return handleRename(context)
      case "DELETE":
        return handleDelete(context)
      default:
        return action === "import" ? handleImport(context) : handleUpload(context)
    }
  }
))

function toTempImage(config: FunctionConfig, path: string): TempImage {
  return {
    name: getDisplayNameFromPath(path),
    path,
    publicUrl: withVersionParam(getPublicUrl(config.tempBucket, path, config.publicStorageUrl), path)
  }
}

function imageResponse(config: FunctionConfig, path: string, headers: HeadersInit): Response {
  const payload: TempImageSuccessResponse = { success: true, data: toTempImage(config, path) }

  return jsonResponse(payload, headers)
}

function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) < 0x20) return true
  }

  return false
}

// Temp images live at the root of the bucket: a path is just a file name.
function isValidTempPath(path: string): boolean {
  return (
    path.length > 0 &&
    path.length <= 255 &&
    path !== "." &&
    path !== ".." &&
    !/[/\\]/.test(path) &&
    !hasControlChars(path)
  )
}

// Post image paths look like `<post-id>/<file>`; reject anything that could
// escape the bucket layout.
function isValidPostImagePath(path: string): boolean {
  if (path.length === 0 || path.length > 1024 || path.startsWith("/") || path.includes("\\") || hasControlChars(path)) {
    return false
  }

  return path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..")
}

async function listAllTempPaths(tempBucket: string): Promise<string[]> {
  const objects = await listAllObjects(tempBucket, "")

  // folders have no id; ".emptyFolderPlaceholder" and similar are hidden
  return objects
    .filter((item) => item.id && item.name && !item.name.startsWith("."))
    .map((item) => item.name)
}

async function handleList({ config, jsonHeaders }: HandlerContext): Promise<Response> {
  const paths = await listAllTempPaths(config.tempBucket)
  const payload: ListTempImagesSuccessResponse = {
    success: true,
    data: paths.map((path) => toTempImage(config, path))
  }

  return jsonResponse(payload, jsonHeaders)
}

async function handleUpload({ req, config, jsonHeaders }: HandlerContext): Promise<Response> {
  const form = await readFormData(req)
  const file = form.get("file")
  const name = form.get("name")

  if (!(file instanceof File)) {
    throw appError(POST_ERROR_CODES.MISSING_FILE)
  }

  if (name !== null && typeof name !== "string") {
    throw appError(POST_ERROR_CODES.INVALID_FORM_DATA)
  }

  validateImageFile(file)

  const { baseName, extension } = splitFileName(file.name)
  const path = buildTempFileName(name?.trim() || baseName, extension)

  try {
    await uploadFile(config.tempBucket, path, file, {
      upsert: false,
      mapErrors: false,
      contentType: file.type
    })
  } catch (error) {
    if (isStorageConflict(error)) {
      throw appError(POST_ERROR_CODES.TEMP_IMAGE_ALREADY_EXISTS)
    }

    throw error
  }

  return imageResponse(config, path, jsonHeaders)
}

async function handleRename({ req, config, jsonHeaders }: HandlerContext): Promise<Response> {
  const body = await readJsonBody(req)

  if (!isRenameTempImageRequestBody(body) || !isValidTempPath(body.path)) {
    throw appError(POST_ERROR_CODES.INVALID_PATH)
  }

  if (!normalizeImageName(body.name)) {
    throw appError(POST_ERROR_CODES.INVALID_NAME)
  }

  const currentPath = body.path
  const { baseName, extension } = splitFileName(getStorageFileName(currentPath))
  const keepToken = extractVersionToken(baseName) ?? undefined
  const nextPath = buildTempFileName(body.name, extension, keepToken)

  if (nextPath === currentPath) {
    return imageResponse(config, currentPath, jsonHeaders)
  }

  try {
    await moveFile(config.tempBucket, currentPath, nextPath)
  } catch (error) {
    if (isStorageNotFound(error)) {
      throw appError(POST_ERROR_CODES.TEMP_IMAGE_NOT_FOUND)
    }

    if (isStorageConflict(error)) {
      throw appError(POST_ERROR_CODES.TEMP_IMAGE_ALREADY_EXISTS)
    }

    throw error
  }

  return imageResponse(config, nextPath, jsonHeaders)
}

async function handleDelete({ req, config, jsonHeaders }: HandlerContext): Promise<Response> {
  const body = await readJsonBody(req)

  if (!isDeleteTempImagesRequestBody(body)) {
    throw appError(POST_ERROR_CODES.INVALID_PATH)
  }

  let paths: string[]

  if ("all" in body) {
    paths = await listAllTempPaths(config.tempBucket)
  } else if (isValidTempPath(body.path)) {
    paths = [body.path]
  } else {
    throw appError(POST_ERROR_CODES.INVALID_PATH)
  }

  const deleted = await removeFiles(config.tempBucket, paths)
  const payload: DeleteTempImagesSuccessResponse = { success: true, data: { deleted } }

  return jsonResponse(payload, jsonHeaders)
}

async function handleImport({ req, config, jsonHeaders }: HandlerContext): Promise<Response> {
  const body = await readJsonBody(req)

  if (!isImportPostImageRequestBody(body) || !isValidPostImagePath(body.postImagePath)) {
    throw appError(POST_ERROR_CODES.INVALID_PATH)
  }

  const sourcePath = body.postImagePath
  const sourceName = getStorageFileName(sourcePath)

  if (!hasAcceptedExtension(sourceName)) {
    throw invalidImageType(sourceName)
  }

  const { extension } = splitFileName(sourceName)
  const path = buildTempFileName(getDisplayNameFromPath(sourcePath), extension)

  try {
    await copyFile(config.postsBucket, sourcePath, config.tempBucket, path)
  } catch (error) {
    if (isStorageNotFound(error)) {
      throw appError(POST_ERROR_CODES.POST_IMAGE_NOT_FOUND)
    }

    throw error
  }

  return imageResponse(config, path, jsonHeaders)
}
