/*
 * Deno tests for createHandler in _lib/http.ts (origin, preflight, method,
 * password and error handling).
 */
import { assertEquals } from "@std/assert"

// Config is memoized per module instance; set the environment before the
// first request reaches createHandler.
Deno.env.set("MDPC_ADMIN_PASSWORD", "s3cret")
Deno.env.set("MDPC_ALLOWED_ORIGINS", "https://admin.example.com")
Deno.env.delete("MDPC_POST_CATEGORIES")

const { createHandler, jsonResponse } = await import("../_lib/http.ts")
const { appError } = await import("../_lib/errors.ts")

const ORIGIN = "https://admin.example.com"
const PASSWORD = { "X-Admin-Password": "s3cret" }

function request(method: string, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/fn", { method, headers })
}

function makeHandler(requireAdmin: boolean, calls: { count: number } = { count: 0 }) {
  return createHandler({ methods: ["GET", "POST"], requireAdmin }, ({ config, jsonHeaders }) => {
    calls.count++

    return Promise.resolve(jsonResponse({ ok: true, categories: config.categories }, jsonHeaders))
  })
}

async function errorOf(res: Response): Promise<unknown> {
  return (await res.json()).error
}

Deno.test("forbidden origin -> 403 FORBIDDEN_ORIGIN, handler not called", async () => {
  const calls = { count: 0 }
  const res = await makeHandler(false, calls)(request("GET", { Origin: "https://evil.com" }))

  assertEquals(res.status, 403)
  assertEquals(await errorOf(res), "FORBIDDEN_ORIGIN")
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), null)
  assertEquals(calls.count, 0)
})

Deno.test("forbidden origin is also rejected on preflight", async () => {
  const res = await makeHandler(false)(request("OPTIONS", { Origin: "https://evil.com" }))

  assertEquals(res.status, 403)
})

Deno.test("allowed preflight -> 204 with CORS headers, no password needed", async () => {
  const calls = { count: 0 }
  const res = await makeHandler(true, calls)(request("OPTIONS", { Origin: ORIGIN }))

  assertEquals(res.status, 204)
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), ORIGIN)
  assertEquals(calls.count, 0)
})

Deno.test("wrong method -> 405 METHOD_NOT_ALLOWED", async () => {
  const res = await makeHandler(true)(request("DELETE", { ...PASSWORD }))

  assertEquals(res.status, 405)
  assertEquals(await errorOf(res), "METHOD_NOT_ALLOWED")
})

Deno.test("requireAdmin: missing and wrong password -> 401", async () => {
  const calls = { count: 0 }
  const handler = makeHandler(true, calls)
  const missing = await handler(request("GET"))
  const wrong = await handler(request("GET", { "X-Admin-Password": "nope" }))

  assertEquals([missing.status, await errorOf(missing)], [401, "MISSING_PASSWORD"])
  assertEquals([wrong.status, await errorOf(wrong)], [401, "WRONG_PASSWORD"])
  assertEquals(calls.count, 0)
})

Deno.test("success passes config and JSON/CORS headers to the inner handler", async () => {
  const calls = { count: 0 }
  const res = await makeHandler(true, calls)(request("POST", { Origin: ORIGIN, ...PASSWORD }))

  assertEquals(res.status, 200)
  assertEquals(res.headers.get("Content-Type"), "application/json")
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), ORIGIN)
  assertEquals(await res.json(), { ok: true, categories: ["BLOG"] })
  assertEquals(calls.count, 1)
})

Deno.test("no Origin and no requireAdmin -> handler runs", async () => {
  assertEquals((await makeHandler(false)(request("GET"))).status, 200)
})

Deno.test("AppError thrown by the body is mapped with CORS headers", async () => {
  const handler = createHandler({ methods: ["GET"] }, () => {
    throw appError("POST_NOT_FOUND", { id: "x" })
  })
  const res = await handler(request("GET", { Origin: ORIGIN }))

  assertEquals(res.status, 404)
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), ORIGIN)
  assertEquals(await res.json(), { error: "POST_NOT_FOUND", details: { id: "x" } })
})

Deno.test("unexpected errors become 500 INTERNAL_ERROR", async () => {
  const original = console.error
  console.error = () => {}

  try {
    const handler = createHandler({ methods: ["GET"] }, () => Promise.reject(new Error("secret detail")))
    const res = await handler(request("GET"))

    assertEquals(res.status, 500)
    assertEquals(await res.json(), { error: "INTERNAL_ERROR" })
  } finally {
    console.error = original
  }
})
