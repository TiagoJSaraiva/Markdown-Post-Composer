/*
 * Vitest tests for services/requestHelpers.ts.
 */
import { describe, expect, it } from "vitest"
import {
  buildAdminHeaders,
  buildPostFormData,
  getPasswordRequiredError,
  handleRequest
} from "../services/requestHelpers.ts"

const baseParams = {
  category: "BLOG",
  title: "T",
  preview: "P",
  content_markdown: "# md",
  active: false,
  banner: null,
  images: []
}

describe("buildPostFormData", () => {
  it("serializes fields and omits id/banner when absent", () => {
    const form = buildPostFormData(baseParams)

    expect(form.get("category")).toBe("BLOG")
    expect(form.get("content_markdown")).toBe("# md")
    expect(form.get("active")).toBe("false")
    expect(form.has("id")).toBe(false)
    expect(form.has("banner")).toBe(false)
    expect(form.getAll("images")).toEqual([])
  })

  it("includes id, banner and images with their display names", () => {
    const banner = new File(["b"], "b.png", { type: "image/png" })
    const first = new File(["1"], "orig1.png", { type: "image/png" })
    const second = new File(["2"], "orig2.png", { type: "image/png" })
    const form = buildPostFormData({
      ...baseParams,
      id: "abc",
      active: true,
      banner,
      images: [{ file: first, name: "one.png" }, { file: second, name: "two.png" }]
    })

    expect(form.get("id")).toBe("abc")
    expect(form.get("active")).toBe("true")
    expect((form.get("banner") as File).name).toBe("b.png")
    expect((form.getAll("images") as File[]).map((file) => file.name)).toEqual(["one.png", "two.png"])
  })

  it("never puts a password in the body", () => {
    const form = buildPostFormData(baseParams)

    expect(form.has("password")).toBe(false)
  })
})

describe("buildAdminHeaders", () => {
  it("sets X-Admin-Password and keeps extra headers", () => {
    const headers = buildAdminHeaders("pw", { Accept: "application/json" })

    expect(headers.get("x-admin-password")).toBe("pw")
    expect(headers.get("accept")).toBe("application/json")
  })

  it("overrides a password passed in the extra headers", () => {
    expect(buildAdminHeaders("new", { "X-Admin-Password": "old" }).get("X-Admin-Password")).toBe("new")
  })
})

describe("getPasswordRequiredError / handleRequest", () => {
  it("flags an empty password only", () => {
    expect(getPasswordRequiredError("")).toEqual({ status: 400, data: null, error: "PASSWORD_REQUIRED" })
    expect(getPasswordRequiredError("x")).toBeNull()
  })

  it("parses JSON, falls back to raw text and reports network failures", async () => {
    expect(await handleRequest(Promise.resolve(Response.json({ a: 1 }, { status: 201 }))))
      .toEqual({ status: 201, data: { a: 1 }, error: null })
    expect(await handleRequest(Promise.resolve(new Response("oops", { status: 502 }))))
      .toEqual({ status: 502, data: { raw: "oops" }, error: null })

    const failure = new Error("offline")
    const original = console.error
    console.error = () => {}

    try {
      expect(await handleRequest(Promise.reject(failure))).toEqual({ status: 0, data: null, error: failure })
    } finally {
      console.error = original
    }
  })
})
