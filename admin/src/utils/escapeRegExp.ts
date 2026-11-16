/*
 * Literal-matching helper for building regular expressions from user text.
 */
/**
 * Escapes every regular expression metacharacter so the value matches literally.
 *
 * @param value - Text to match literally.
 * @returns The escaped text, safe to embed in a RegExp.
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
