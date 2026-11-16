/*
 * Thin file name helpers over the shared naming rules. Used by the draft and markdown
 * image utilities.
 */
import { getStorageFileName, splitFileName } from "@mdpc/shared/domain/tempImageNaming.ts";

/**
 * Removes the last extension: "photo.jpg" -> "photo". Leading-dot names are kept.
 *
 * @param fileName - File name.
 * @returns The name without extension.
 */
export function stripExtension(fileName: string): string {
  return splitFileName(fileName).baseName;
}

/**
 * Last segment of a storage path: "<id>/photo.jpg" -> "photo.jpg".
 *
 * @param path - Object path.
 * @returns The file name.
 */
export function getFileNameFromPath(path: string): string {
  return getStorageFileName(path);
}
