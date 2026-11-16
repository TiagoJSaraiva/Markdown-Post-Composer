/*
 * Single definition of how Markdown image references are found and rewritten.
 * The Edge Functions use it to turn image names into storage paths on save; the admin
 * uses it for validation, the live preview and turning stored paths back into names.
 */

/**
 * Matches `![alt](target)` and `![alt](target "title")` (title in `"`, `'` or `()`).
 * Like CommonMark, the target may contain one level of balanced parentheses (`a(1).png`).
 * Groups: 1 = `![alt](`, 2 = target, 3 = title with its leading whitespace (may be empty).
 */
const IMAGE_REFERENCE =
  /(!\[[^\]]*\]\()\s*((?:[^\s()]|\([^\s()]*\))+)((?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?)\s*\)/g

/**
 * Lists the targets of every Markdown image, in order, titles excluded.
 *
 * @param markdown - Post body.
 * @returns The raw targets, e.g. `["cat", "./dog.png", "https://x/y.png"]`.
 */
export function listImageTargets(markdown: string): string[] {
  return Array.from(markdown.matchAll(IMAGE_REFERENCE), (match) => match[2])
}

/**
 * Rewrites the target of every Markdown image for which `resolve` returns a value,
 * keeping the alt text and the optional title. Text outside image syntax is never touched.
 *
 * @param markdown - Post body.
 * @param resolve - Maps a raw target to its replacement, or `null` to keep it.
 * @returns The rewritten markdown.
 * @example
 * rewriteImageTargets('![a](cat "Kitty")', (t) => (t === "cat" ? "id/cat.png" : null))
 * // '![a](id/cat.png "Kitty")'
 */
export function rewriteImageTargets(markdown: string, resolve: (target: string) => string | null): string {
  return markdown.replace(IMAGE_REFERENCE, (match, open: string, target: string, title: string) => {
    const next = resolve(target)

    return next === null ? match : `${open}${next}${title})`
  })
}

/**
 * Extracts the image name an author typed as a local reference: `name`, `./name`,
 * `name.ext` or `./name.ext`. Anything with a path separator, scheme, query or hash
 * is not a local name.
 *
 * @param target - Raw image target.
 * @returns The name (extension kept), or `null` when the target is not a local name.
 */
export function getLocalImageName(target: string): string | null {
  const name = target.startsWith("./") ? target.slice(2) : target

  if (!name || /[/\\?#:]/.test(name)) {
    return null
  }

  return name
}

/**
 * Finds the entry of `byName` that a local image reference points to: the exact name
 * first, then the name without its extension (so `cat.png` finds `cat`).
 *
 * @param target - Raw image target.
 * @param byName - Values keyed by image name (no extension).
 * @returns The matching value, or `undefined`.
 */
export function lookupLocalImage<T>(target: string, byName: Readonly<Record<string, T>>): T | undefined {
  const name = getLocalImageName(target)

  if (name === null) {
    return undefined
  }

  if (Object.hasOwn(byName, name)) {
    return byName[name]
  }

  const dot = name.lastIndexOf(".")

  if (dot > 0) {
    const baseName = name.slice(0, dot)

    if (Object.hasOwn(byName, baseName)) {
      return byName[baseName]
    }
  }

  return undefined
}
