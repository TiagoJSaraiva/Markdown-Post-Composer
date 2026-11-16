/*
 * Deno tests for _lib/errors.ts and the error mapping in _lib/http.ts.
 */
import { assertEquals, assertNotMatch } from "@std/assert"
import { POST_ERROR_CODES } from "@shared/contracts/postErrorCodes.ts"
import { ConfigError } from "../_lib/config.ts"
import { appError, AppError, ERROR_STATUS, imageTooLarge, invalidImageType } from "../_lib/errors.ts"
import { toErrorResponse } from "../_lib/http.ts"

async function silenced<T>(fn: () => Promise<T>): Promise<T> {
  const original = console.error
  console.error = () => {}

  try {
    return await fn()
  } finally {
    console.error = original
  }
}

Deno.test("every error code has an HTTP status", () => {
  for (const code of Object.values(POST_ERROR_CODES)) {
    assertEquals(typeof ERROR_STATUS[code], "number", code)
  }
})

Deno.test("appError derives the status from the code", () => {
  const error = appError("POST_NOT_FOUND")

  assertEquals(error instanceof AppError, true)
  assertEquals([error.code, error.status], ["POST_NOT_FOUND", 404])
})

Deno.test("image error helpers carry file details", () => {
  assertEquals(invalidImageType("a.gif").details?.file, "a.gif")
  assertEquals(imageTooLarge("a.png").details?.file, "a.png")
  assertEquals(typeof imageTooLarge("a.png").details?.maxMb, "number")
})

Deno.test("toErrorResponse maps AppError to status, code and details", async () => {
  const res = toErrorResponse(appError("INVALID_IMAGE_TYPE", { file: "a.gif" }), { "X-Test": "1" })

  assertEquals(res.status, 400)
  assertEquals(res.headers.get("X-Test"), "1")
  assertEquals(await res.json(), { error: "INVALID_IMAGE_TYPE", details: { file: "a.gif" } })
})

Deno.test("toErrorResponse omits details when there are none", async () => {
  assertEquals(await toErrorResponse(appError("WRONG_PASSWORD"), {}).json(), { error: "WRONG_PASSWORD" })
})

Deno.test("toErrorResponse maps ConfigError to 500 SERVER_MISCONFIGURED without the variable", async () => {
  await silenced(async () => {
    const res = toErrorResponse(new ConfigError("MDPC_ADMIN_PASSWORD", "missing"), {})
    const text = await res.text()

    assertEquals(res.status, 500)
    assertEquals(JSON.parse(text), { error: "SERVER_MISCONFIGURED" })
    assertNotMatch(text, /MDPC_ADMIN_PASSWORD/)
  })
})

Deno.test("toErrorResponse hides unknown error messages behind INTERNAL_ERROR", async () => {
  await silenced(async () => {
    const res = toErrorResponse(new Error("db password is hunter2"), {})
    const text = await res.text()

    assertEquals(res.status, 500)
    assertEquals(JSON.parse(text), { error: "INTERNAL_ERROR" })
    assertNotMatch(text, /hunter2/)
  })
})
