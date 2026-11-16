/*
 * Parsing and rewriting of image references in the post markdown. While writing, the
 * author refers to images by name; stored posts use storage paths. Used by draft.ts and
 * the edit flow.
 */
import { listImageTargets, rewriteImageTargets } from "@mdpc/shared/domain/markdownImageRefs.ts";
import { getFileNameFromPath, stripExtension } from "./fileNames";

/** A local image reference found in the markdown. */
export type MarkdownImageRef = {
  /** Reference as typed, without a leading `./` (used in messages). */
  raw: string;
  /** Image name as referenced, extension included (same as `raw`). */
  normalized: string;
  /** `normalized` without its extension. */
  normalizedNoExt: string;
};

/**
 * True for absolute URLs (any scheme or `//`), data/blob/mailto/tel URLs and anchors.
 *
 * @param url - Image target.
 * @returns `true` when the target is not a local image name or path.
 */
export function isAbsoluteOrSpecialUrl(url: string): boolean {
  return /^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(url) ||
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.startsWith("mailto:") ||
    url.startsWith("tel:") ||
    url.startsWith("#");
}

/**
 * Image name of a local reference, following the rules shared with the server
 * (`name`, `./name`, `name.ext`). Kept as written otherwise (minus `./`), so names with
 * a query, hash or other odd characters are still reported by the validation.
 *
 * @param raw - Image target as written in the markdown.
 * @returns The name, or an empty string for storage paths (`dir/file`) and empty targets.
 */
export function normalizeRefName(raw: string): string {
  const target = raw.trim();
  const name = target.startsWith("./") ? target.slice(2) : target;

  return name.includes("/") ? "" : name;
}

/** Target of every `![alt](target "title")` that is not an absolute or special URL. */
function getRelativeImageTargets(markdown: string): string[] {
  return listImageTargets(markdown).filter((target) => !isAbsoluteOrSpecialUrl(target));
}

/**
 * Local image references (names the author typed) found in the markdown. Storage paths
 * (`<id>/file.jpg`, kept from a published post) are not local references.
 *
 * @param markdown - Post body.
 * @returns One entry per reference, in order and without deduplication; absolute URLs are skipped.
 */
export function getMarkdownImageReferences(markdown: string): MarkdownImageRef[] {
  const refs: MarkdownImageRef[] = [];

  for (const target of getRelativeImageTargets(markdown)) {
    const normalized = normalizeRefName(target);

    if (!normalized) {
      continue;
    }

    refs.push({
      raw: normalized,
      normalized,
      normalizedNoExt: stripExtension(normalized)
    });
  }

  return refs;
}

/**
 * Unique relative storage paths (containing a `/`) referenced by images, e.g. `<id>/photo.jpg`.
 *
 * @param markdown - Post body.
 * @returns The paths in order of first appearance.
 */
export function extractRelativeImagePathsFromMarkdown(markdown: string): string[] {
  const paths = new Set<string>();

  for (const target of getRelativeImageTargets(markdown)) {
    if (target.includes("/")) {
      paths.add(target);
    }
  }

  return Array.from(paths);
}

/**
 * Rewrites `(<storage path>)` to `(<file name without extension>)` for each given path, so a
 * stored post reads like the author wrote it.
 *
 * @param markdown - Post body with storage paths.
 * @param imagePaths - Storage paths to rewrite.
 * @returns The markdown with short image names; other targets are left untouched.
 */
export function reverseMarkdownImagePaths(markdown: string, imagePaths: string[]): string {
  const shortNames = new Map<string, string>();

  for (const path of imagePaths) {
    const shortName = stripExtension(getFileNameFromPath(path));

    if (shortName) {
      shortNames.set(path, shortName);
    }
  }

  return rewriteImageTargets(markdown, (target) => shortNames.get(target) ?? null);
}
