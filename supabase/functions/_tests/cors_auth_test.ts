/*
 * Deno tests for _lib/cors.ts and _lib/auth.ts.
 */
import { assertEquals, assertRejects } from "@std/assert"
import { AppError } from "../_lib/errors.ts"
import { assertAdminPassword, safeEqual } from "../_lib/auth.ts"
import type { FunctionConfig } from "../_lib/config.ts"
import { getCorsHeaders, getJsonHeaders, isOriginAllowed, resolveAllowedOrigin } from "../_lib/cors.ts"

const config: FunctionConfig = {
  adminPassword: "s3cret",
  allowedOrigins: ["https://admin.example.com", "http://localhost:5173"],
  categories: ["BLOG"],
  postsBucket: "post-images",
  tempBucket: "temp",
  publicStorageUrl: null
}

Deno.test("isOriginAllowed: no Origin header is allowed", () => {
  assertEquals(isOriginAllowed(null, config), true)
})

Deno.test("isOriginAllowed requires an exact origin match, port included", () => {
  const cases: [string, boolean][] = [
    ["https://admin.example.com", true],
    ["http://localhost:5173", true],
    ["http://localhost:3000", false],
    ["http://localhost", false],
    ["http://admin.example.com", false],
    ["https://admin.example.com.evil.com", false],
    ["https://evil.com", false],
    ["null", false],
    ["", false]
  ]

  for (const [origin, expected] of cases) {
    assertEquals(isOriginAllowed(origin, config), expected, origin)
  }
})

Deno.test("isOriginAllowed denies every origin when none is configured", () => {
  assertEquals(isOriginAllowed("https://admin.example.com", { ...config, allowedOrigins: [] }), false)
})

Deno.test("resolveAllowedOrigin returns the normalized origin", () => {
  assertEquals(resolveAllowedOrigin("https://admin.example.com", config.allowedOrigins), "https://admin.example.com")
  assertEquals(resolveAllowedOrigin(null, config.allowedOrigins), null)
})

Deno.test("CORS headers echo only allowed origins and always send Vary", () => {
  const allowed = getCorsHeaders("http://localhost:5173", config)
  const denied = getCorsHeaders("https://evil.com", config)

  assertEquals(allowed["Access-Control-Allow-Origin"], "http://localhost:5173")
  assertEquals("Access-Control-Allow-Origin" in denied, false)
  assertEquals(denied["Vary"], "Origin")
  assertEquals(getJsonHeaders(null, config)["Content-Type"], "application/json")
})

Deno.test("safeEqual compares values, including different lengths", async () => {
  assertEquals(await safeEqual("abc", "abc"), true)
  assertEquals(await safeEqual("abc", "abd"), false)
  assertEquals(await safeEqual("abc", "abcd"), false)
  assertEquals(await safeEqual("", ""), true)
})

async function passwordError(headers: HeadersInit): Promise<string> {
  const error = await assertRejects(
    () => assertAdminPassword(new Request("http://x", { headers }), config),
    AppError
  )

  assertEquals(error.status, 401)

  return error.code
}

Deno.test("assertAdminPassword: missing, wrong and right header", async () => {
  assertEquals(await passwordError({}), "MISSING_PASSWORD")
  assertEquals(await passwordError({ "x-admin-password": "" }), "MISSING_PASSWORD")
  assertEquals(await passwordError({ "x-admin-password": "nope" }), "WRONG_PASSWORD")
  await assertAdminPassword(new Request("http://x", { headers: { "X-Admin-Password": "s3cret" } }), config)
})
