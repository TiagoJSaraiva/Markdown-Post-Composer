/*
 * Parsing and rewriting of image references in the post markdown. While writing, the
 * author refers to images by name; stored posts use storage paths. Used by draft.ts and
 * the edit flow.
 */
import { escapeRegExp } from "./escapeRegExp";
import { getFileNameFromPath, stripExtension } from "./fileNames";

/** A local image reference found in the markdown. */
export type MarkdownImageRef = {
  /** Reference as typed, reduced to its last path segment. */
  raw: string;
  /** Last path segment without quotes, query string or hash. */
  normalized: string;
  /** `normalized` without its extension. */
  normalizedNoExt: string;
};

/** Matches `![alt](target)` and captures the target. */
const MARKDOWN_IMAGE_REGEX = /!\[[^\]]*\]\(([^)]+)\)/g;

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
 * Last path segment of an image target, without quotes, query string or hash.
 *
 * @param raw - Image target as written in the markdown.
 * @returns The normalized name, possibly empty.
 */
export function normalizeRefName(raw: string): string {
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, "");
  const withoutHash = trimmed.split("#")[0] ?? "";
  const withoutQuery = withoutHash.split("?")[0] ?? "";
  const lastSegment = withoutQuery.split("/").filter(Boolean).pop() ?? withoutQuery;

  return lastSegment.trim();
}

/** Link target (first token, title dropped) of every `![alt](target)` that is not an absolute URL. */
function getRelativeImageTargets(markdown: string): string[] {
  const targets: string[] = [];

  for (const match of markdown.matchAll(MARKDOWN_IMAGE_REGEX)) {
    const rawTarget = (match[1] ?? "").trim();
    const target = rawTarget.split(/\s+/)[0] ?? "";

    if (target && !isAbsoluteOrSpecialUrl(target)) {
      targets.push(target);
    }
  }

  return targets;
}

/**
 * Local image references (names the author typed) found in the markdown.
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
  let result = markdown;

  for (const path of imagePaths) {
    const shortName = stripExtension(getFileNameFromPath(path));

    if (!shortName) {
      continue;
    }

    const regex = new RegExp(`\\(${escapeRegExp(path)}\\)`, "g");
    result = result.replace(regex, () => `(${shortName})`);
  }

  return result;
}
