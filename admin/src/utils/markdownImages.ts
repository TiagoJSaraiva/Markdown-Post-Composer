import { escapeRegExp } from "./escapeRegExp";
import { getFileNameFromPath, stripExtension } from "./fileNames";

export type MarkdownImageRef = {
  raw: string;
  normalized: string;
  normalizedNoExt: string;
};

const MARKDOWN_IMAGE_REGEX = /!\[[^\]]*\]\(([^)]+)\)/g;

/** True for absolute URLs (any scheme or `//`), data/blob/mailto/tel URLs and anchors. */
export function isAbsoluteOrSpecialUrl(url: string): boolean {
  return /^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(url) ||
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.startsWith("mailto:") ||
    url.startsWith("tel:") ||
    url.startsWith("#");
}

/** Last path segment of an image target, without quotes, query string or hash. */
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

/** Local image references (names the author typed) found in the markdown. */
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

/** Unique relative storage paths (containing a `/`) referenced by images, e.g. `<id>/photo.jpg`. */
export function extractRelativeImagePathsFromMarkdown(markdown: string): string[] {
  const paths = new Set<string>();

  for (const target of getRelativeImageTargets(markdown)) {
    if (target.includes("/")) {
      paths.add(target);
    }
  }

  return Array.from(paths);
}

/** Rewrites `(<storage path>)` to `(<file name without extension>)` for each given path. */
export function reverseMarkdownImagePaths(markdown: string, imagePaths: string[]): string {
  let result = markdown;

  for (const path of imagePaths) {
    const shortName = stripExtension(getFileNameFromPath(path));

    if (!shortName) {
      continue;
    }

    const regex = new RegExp(`\\(${escapeRegExp(path)}\\)`, "g");
    result = result.replace(regex, `(${shortName})`);
  }

  return result;
}
