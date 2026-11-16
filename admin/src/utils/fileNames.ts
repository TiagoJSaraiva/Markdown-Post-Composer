import { getStorageFileName, splitFileName } from "@mdpc/shared/domain/tempImageNaming.ts";

/** Removes the last extension: "photo.jpg" -> "photo". Leading-dot names are kept. */
export function stripExtension(fileName: string): string {
  return splitFileName(fileName).baseName;
}

/** Last segment of a storage path: "<id>/photo.jpg" -> "photo.jpg". */
export function getFileNameFromPath(path: string): string {
  return getStorageFileName(path);
}
