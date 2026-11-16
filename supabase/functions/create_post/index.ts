import "@supabase/functions-js/edge-runtime.d.ts"
import { normalizePostCategory } from "@shared/domain/postCategory.ts"
import {
  deleteFiles,
  generateUUID,
  insertPostWithRetry,
  replaceImagePaths,
  slugify,
  uploadBanner,
  uploadContentImages
} from "../_lib/auxiliaryFunctions.ts"
import { checkAdminPassword } from "../_lib/auth.ts"
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  knownErrorResponse
} from "../_lib/errorMessages.ts"
import { errorResponse, internalErrorResponse, prepareRequest } from "../_lib/http.ts"

Deno.serve(async (req) => {

  const context = prepareRequest(req)

  if (context instanceof Response) {
    return context
  }

  const { config, jsonHeaders } = context

  const uploadedPaths: string[] = []

  try {

    if (req.method !== "POST") {
      return errorResponse(ERROR_MESSAGES.METHOD_NOT_ALLOWED, 405, jsonHeaders)
    }

    const passwordError = await checkAdminPassword(req, config, jsonHeaders)

    if (passwordError) {
      return passwordError
    }

    let form: FormData

    try {
      form = await req.formData()
    } catch {
      return errorResponse(ERROR_MESSAGES.INVALID_FORM_DATA, 400, jsonHeaders)
    }

    const category = form.get("category")
    const title = form.get("title")
    const preview = form.get("preview")
    const contentMarkdown = form.get("content_markdown")
    const active = form.get("active")

    const banner = form.get("banner")
    const images = form.getAll("images")

    const imageFiles = images.filter(
      (image): image is File => image instanceof File
    )

    if (
      typeof category !== "string" ||
      typeof title !== "string" ||
      typeof preview !== "string" ||
      typeof contentMarkdown !== "string" ||
      typeof active !== "string" ||
      !(banner instanceof File) ||
      imageFiles.length !== images.length
    ) {
      return errorResponse(ERROR_MESSAGES.INVALID_FORM_DATA, 400, jsonHeaders)
    }

    const normalizedCategory = normalizePostCategory(category, config.categories)

    if (!normalizedCategory) {
      return errorResponse(ERROR_MESSAGES.INVALID_FORM_DATA, 400, jsonHeaders)
    }

    const parsedActive = parseActiveValue(active)

    if (parsedActive === null) {
      return errorResponse(ERROR_MESSAGES.INVALID_FORM_DATA, 400, jsonHeaders)
    }

    const postId = generateUUID()

    const slug = slugify(title)

    if (!slug) {
      return errorResponse(ERROR_MESSAGES.INVALID_TITLE, 400, jsonHeaders)
    }

    const bannerPath = await uploadBanner(postId, banner, { onUploaded: path => uploadedPaths.push(path) })


    const contentPaths = await uploadContentImages(postId, imageFiles, {
      onUploaded: path => uploadedPaths.push(path)
    })


    const finalMarkdown = replaceImagePaths(
      contentMarkdown,
      contentPaths
    )

    const postData = {
      id: postId,
      post_type: normalizedCategory,
      title,
      slug,
      banner_path: bannerPath,
      preview,
      content_markdown: finalMarkdown,
      active: parsedActive
    }

    const finalId = await insertPostWithRetry(postData)

    return new Response(
      JSON.stringify({
        success: true,
        message: SUCCESS_MESSAGES.POST_CREATED,
        id: finalId
      }),
      {
        status: 200,
        headers: jsonHeaders
      }
    )

  } catch (err: unknown) {

    try {
      await deleteFiles(uploadedPaths)
    } catch (cleanupError) {
      console.error("Failed to cleanup uploaded files", cleanupError)
    }

    return knownErrorResponse(err, jsonHeaders) ?? internalErrorResponse(err, jsonHeaders)
  }
})

function parseActiveValue(value: string): boolean | null {
  const normalized = value.trim().toLowerCase()

  if (normalized === "true") {
    return true
  }

  if (normalized === "false") {
    return false
  }

  return null
}
