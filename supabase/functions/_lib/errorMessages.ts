import { POST_ERROR_CODES } from "../../../shared/contracts/postErrorCodes.ts"
import { POST_SUCCESS_CODES } from "../../../shared/contracts/postSuccessCodes.ts"
import { ACCEPTED_EXTENSIONS, MAX_IMAGE_MB } from "../../../shared/constants/images.ts"
import { errorResponse } from "./http.ts"

export const ERROR_MESSAGES = POST_ERROR_CODES

export const SUCCESS_MESSAGES = POST_SUCCESS_CODES

export function invalidImageTypeResponse(fileName: string, headers: HeadersInit): Response {
  return errorResponse(POST_ERROR_CODES.INVALID_IMAGE_TYPE, 400, headers, {
    file: fileName,
    acceptedExtensions: ACCEPTED_EXTENSIONS
  })
}

export function imageTooLargeResponse(fileName: string, headers: HeadersInit): Response {
  return errorResponse(POST_ERROR_CODES.IMAGE_TOO_LARGE, 400, headers, {
    file: fileName,
    maxMb: MAX_IMAGE_MB
  })
}

// Maps the errors thrown by the helpers in auxiliaryFunctions.ts to a coded
// response, or returns null when the error is not a known one.
export function knownErrorResponse(err: unknown, headers: HeadersInit): Response | null {
  const message = err instanceof Error ? err.message : ""

  switch (message) {
    case "TITLE_OR_SLUG_ALREADY_EXISTS":
      return errorResponse(POST_ERROR_CODES.TITLE_OR_SLUG_ALREADY_EXISTS, 409, headers)
    case "DUPLICATE_IMAGE_NAME":
      return errorResponse(POST_ERROR_CODES.DUPLICATE_IMAGE_NAME, 400, headers)
    case "INVALID_BANNER_EXTENSION":
    case "INVALID_IMAGE_EXTENSION":
      return errorResponse(POST_ERROR_CODES.INVALID_EXTENSION, 400, headers)
    case "UUID_COLLISION":
      return errorResponse(POST_ERROR_CODES.UUID_COLLISION, 500, headers)
    case "TRANSIENT_ERROR_RETRY_FAILED":
      return errorResponse(POST_ERROR_CODES.TRANSIENT_ERROR_RETRY_FAILED, 503, headers)
  }

  const invalidTypeMatch = /^INVALID_IMAGE_MIME:(.+)$/.exec(message)

  if (invalidTypeMatch) {
    return invalidImageTypeResponse(invalidTypeMatch[1].trim(), headers)
  }

  const tooLargeMatch = /^IMAGE_TOO_LARGE:(.+)$/.exec(message)

  if (tooLargeMatch) {
    return imageTooLargeResponse(tooLargeMatch[1].trim(), headers)
  }

  return null
}
