/*
 * Client of the temp_images Edge Function: the staging area where images live while
 * a post is being composed. Failures throw ApiError. Used by the form and editor hooks.
 */
import { functionUrl } from "../lib/edgeFunctionsPaths";
import { ApiError, parseErrorBody } from "../lib/apiError";
import { buildAdminHeaders } from "@mdpc/shared/services/requestHelpers.ts";
import {
  isDeleteTempImagesSuccessResponse,
  isListTempImagesSuccessResponse,
  isTempImageSuccessResponse,
  type TempImage
} from "@mdpc/shared/contracts/tempImages.ts";
import { getStorageFileName, splitFileName } from "@mdpc/shared/domain/tempImageNaming.ts";

/** A staged image as the admin uses it. */
export type TempStorageImage = {
  /** Display name (no version suffix, no extension). */
  name: string;
  /** Object path in the temp bucket. */
  storagePath: string;
  /** Public URL, with the cache-busting version parameter. */
  publicUrl: string;
};

/** Parameters of one temp_images request. */
type CallOptions = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  query?: string;
  json?: unknown;
  form?: FormData;
  keepalive?: boolean;
};

function toStorageImage(image: TempImage): TempStorageImage {
  return { name: image.name, storagePath: image.path, publicUrl: image.publicUrl };
}

/** Calls the temp_images function; throws ApiError on any failure. */
async function call(
  password: string,
  guard: (body: unknown) => boolean,
  { method, query = "", json, form, keepalive }: CallOptions
): Promise<unknown> {
  const headers = buildAdminHeaders(password, json === undefined ? undefined : { "Content-Type": "application/json" });
  let response: Response;

  try {
    response = await fetch(`${functionUrl("temp_images")}${query}`, {
      method,
      headers,
      body: form ?? (json === undefined ? undefined : JSON.stringify(json)),
      keepalive
    });
  } catch (error) {
    throw new ApiError(0, "NETWORK_ERROR", { message: error instanceof Error ? error.message : String(error) });
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  if (!response.ok) {
    const { code, details } = parseErrorBody(body);
    throw new ApiError(response.status, code ?? "INVALID_RESPONSE", details);
  }

  if (!guard(body)) {
    throw new ApiError(response.status, "INVALID_RESPONSE");
  }

  return (body as { data: unknown }).data;
}

/**
 * Lists the staged images.
 *
 * @param password - Admin password.
 * @returns The images in temp storage.
 * @throws ApiError on any failure.
 */
export async function listTempImages(password: string): Promise<TempStorageImage[]> {
  const data = await call(password, isListTempImagesSuccessResponse, { method: "GET" });
  return (data as TempImage[]).map(toStorageImage);
}

/**
 * Stages a new image.
 *
 * @param password - Admin password.
 * @param file - Image file.
 * @param desiredName - Wanted display name; the backend picks one when empty.
 * @returns The staged image.
 * @throws ApiError on any failure.
 */
export async function uploadTempImage(password: string, file: File, desiredName: string): Promise<TempStorageImage> {
  const form = new FormData();
  form.append("file", file, file.name);

  if (desiredName) {
    form.append("name", desiredName);
  }

  const data = await call(password, isTempImageSuccessResponse, { method: "POST", form });
  return toStorageImage(data as TempImage);
}

/**
 * Renames a staged image.
 *
 * @param password - Admin password.
 * @param currentPath - Current object path.
 * @param nextName - New display name.
 * @returns The renamed image (its path changes).
 * @throws ApiError on any failure.
 */
export async function renameTempImage(password: string, currentPath: string, nextName: string): Promise<TempStorageImage> {
  const data = await call(password, isTempImageSuccessResponse, {
    method: "PATCH",
    json: { path: currentPath, name: nextName }
  });
  return toStorageImage(data as TempImage);
}

/**
 * Deletes one staged image.
 *
 * @param password - Admin password.
 * @param path - Object path; nothing happens when empty.
 * @throws ApiError on any failure.
 */
export async function deleteTempImage(password: string, path: string): Promise<void> {
  if (!path) {
    return;
  }

  await call(password, isDeleteTempImagesSuccessResponse, { method: "DELETE", json: { path } });
}

/**
 * Deletes every staged image. `keepalive` lets the request outlive the page (used on pagehide).
 *
 * @param password - Admin password.
 * @param options - `keepalive` keeps the request alive while the page unloads.
 * @throws ApiError on any failure.
 */
export async function clearTempImages(password: string, options: { keepalive?: boolean } = {}): Promise<void> {
  await call(password, isDeleteTempImagesSuccessResponse, {
    method: "DELETE",
    json: { all: true },
    keepalive: options.keepalive
  });
}

/**
 * Copies a published post image into temp (server side), so it can be edited.
 *
 * @param password - Admin password.
 * @param postImagePath - Object path in the posts bucket.
 * @returns The staged copy.
 * @throws ApiError on any failure.
 */
export async function importPostImageToTemp(password: string, postImagePath: string): Promise<TempStorageImage> {
  const data = await call(password, isTempImageSuccessResponse, {
    method: "POST",
    query: "?action=import",
    json: { postImagePath }
  });
  return toStorageImage(data as TempImage);
}

/**
 * Downloads a staged image as a File, ready to be sent with the post.
 *
 * @param publicUrl - Public URL of the staged image.
 * @param desiredBaseName - File name without extension; the extension of the URL is kept.
 * @returns The file.
 * @throws ApiError on network failure or a non-OK response.
 */
export async function downloadTempImageAsFile(publicUrl: string, desiredBaseName: string): Promise<File> {
  let response: Response;

  try {
    response = await fetch(publicUrl);
  } catch (error) {
    throw new ApiError(0, "NETWORK_ERROR", { message: error instanceof Error ? error.message : String(error) });
  }

  if (!response.ok) {
    throw new ApiError(response.status, "TEMP_IMAGE_NOT_FOUND");
  }

  const blob = await response.blob();
  const { extension } = splitFileName(getStorageFileName(new URL(publicUrl).pathname));
  const fileName = extension ? `${desiredBaseName}.${extension}` : desiredBaseName;

  return new File([blob], fileName, { type: blob.type || "application/octet-stream" });
}
