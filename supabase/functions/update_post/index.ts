import "@supabase/functions-js/edge-runtime.d.ts"
import { normalizePostCategory } from "@shared/domain/postCategory.ts"
import { supabase } from "../_lib/supabaseClient.ts"
import {
  deleteFiles,
  listAllPostFiles,
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
  const existingPathsBeforeUpdate = new Set<string>()

  try {

    if (req.method !== "PUT") {
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

    const id = form.get("id")
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
      typeof id !== "string" ||
      typeof category !== "string" ||
      typeof title !== "string" ||
      typeof preview !== "string" ||
      typeof contentMarkdown !== "string" ||
      typeof active !== "string" ||
      (banner !== null && !(banner instanceof File)) ||
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

    const { data: existingPost, error: fetchError } = await supabase
      .from("posts")
      .select("id, banner_path")
      .eq("id", id)
      .single()

    if (fetchError || !existingPost) {
      return errorResponse(ERROR_MESSAGES.POST_NOT_FOUND, 404, jsonHeaders)
    }

    const slug = slugify(title)

    if (!slug) {
      return errorResponse(ERROR_MESSAGES.INVALID_TITLE, 400, jsonHeaders)
    }

    const existingFiles = await listAllPostFiles(id)
    const existingPaths = existingFiles.map(file => `${id}/${file.name}`)

    for (const path of existingPaths) {
      existingPathsBeforeUpdate.add(path)
    }

    let bannerPath = existingPost.banner_path

    if (banner instanceof File) {
      bannerPath = await uploadBanner(id, banner, {
        upsert: true,
        mapErrors: false
      })
      uploadedPaths.push(bannerPath)
    }

    const contentPaths = await uploadContentImages(id, imageFiles, {
      upsert: true,
      mapErrors: false
    })
    uploadedPaths.push(...Object.values(contentPaths))

    const finalMarkdown = replaceImagePaths(
      contentMarkdown,
      contentPaths
    )

    const { error: updateError } = await supabase
      .from("posts")
      .update({
        post_type: normalizedCategory,
        title,
        slug,
        banner_path: bannerPath,
        preview,
        content_markdown: finalMarkdown,
        active: parsedActive
      })
      .eq("id", id)

    if (updateError) {
      if (
        updateError.message.includes("posts_slug_unique") ||
        updateError.message.includes("posts_title_unique")
      ) {
        throw new Error("TITLE_OR_SLUG_ALREADY_EXISTS")
      }

      throw updateError
    }

    const keepPaths = new Set<string>([
      bannerPath,
      ...Object.values(contentPaths)
    ])

    const removePaths = existingPaths.filter(path => !keepPaths.has(path))

    await deleteFiles(removePaths)

    return new Response(
      JSON.stringify({
        success: true,
        message: SUCCESS_MESSAGES.POST_UPDATED,
        id
      }),
      {
        status: 200,
        headers: jsonHeaders
      }
    )

  } catch (err: unknown) {

    try {
      const cleanupPaths = uploadedPaths.filter(path => !existingPathsBeforeUpdate.has(path))
      await deleteFiles(cleanupPaths)
    } catch (cleanupError) {
      console.error("Failed cleanup", cleanupError)
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