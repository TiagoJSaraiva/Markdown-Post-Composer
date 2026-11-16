import { assertEquals } from "@std/assert"
import type { AppError } from "../_lib/errors.ts"
import { isTransientError, isUniqueViolation, mapPostWriteError } from "../_lib/postsRepository.ts"

Deno.test("isUniqueViolation matches only SQLSTATE 23505", () => {
  assertEquals(isUniqueViolation({ code: "23505" }), true)
  assertEquals(isUniqueViolation({ code: "23503" }), false)
  assertEquals(isUniqueViolation(null), false)
  assertEquals(isUniqueViolation(undefined), false)
})

Deno.test("mapPostWriteError: primary key -> UUID_COLLISION, other constraints -> title/slug taken", () => {
  const pkey = mapPostWriteError({ code: "23505", message: 'duplicate key value violates unique constraint "posts_pkey"' })
  const slug = mapPostWriteError({ code: "23505", message: 'violates unique constraint "posts_slug_key"' })
  const title = mapPostWriteError({ code: "23505", details: "Key (title)=(x) already exists.", message: "posts_title_key" })

  assertEquals((pkey as AppError).code, "UUID_COLLISION")
  assertEquals((pkey as AppError).status, 500)
  assertEquals((slug as AppError).code, "TITLE_OR_SLUG_ALREADY_EXISTS")
  assertEquals((slug as AppError).status, 409)
  assertEquals((title as AppError).code, "TITLE_OR_SLUG_ALREADY_EXISTS")
})

Deno.test("mapPostWriteError returns other errors untouched", () => {
  const other = { code: "42P01", message: "boom" }

  assertEquals(mapPostWriteError(other), other)
})

Deno.test("isTransientError", () => {
  const cases: [unknown, boolean][] = [
    [{ status: 502 }, true],
    [{ status: 503 }, true],
    [{ status: 504 }, true],
    [{ status: 500 }, false],
    [{ message: "Connection terminated" }, true],
    [{ message: "request timed out" }, true],
    [{ message: "TypeError: NetworkError" }, true],
    [{ code: "ECONNRESET" }, true],
    [{ code: "etimedout" }, true],
    [{ code: "23505", message: "duplicate key" }, false],
    [null, false],
    [undefined, false],
    ["oops", false]
  ]

  for (const [error, expected] of cases) {
    assertEquals(isTransientError(error), expected, JSON.stringify(error))
  }
})
