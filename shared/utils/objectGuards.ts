/*
 * Small type guards used by the contract validators.
 */
/**
 * Checks that a value is a non-null object (arrays included).
 *
 * @param value - Value to check.
 * @returns `true` for a non-null object.
 */
export function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

/**
 * Checks that an object property is a string.
 *
 * @param obj - Object to inspect.
 * @param key - Property name.
 * @returns `true` when `obj[key]` is a string.
 */
export function hasStringField(obj: Record<string, unknown>, key: string): boolean {
  return typeof obj[key] === "string"
}

/**
 * Checks that a value is an array of strings.
 *
 * @param value - Value to check.
 * @returns `true` for an array whose items are all strings.
 */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}
