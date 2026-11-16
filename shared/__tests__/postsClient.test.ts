/*
 * Vitest tests for client/postsClient.ts with a fake fetch.
 */
import { describe, expect, it } from "vitest"
import { createPostsClient } from "../client/index.ts"
import type { FetchLike } from "../client/index.ts"
import { card, details } from "./fixtures.ts"

type Call = { url: string; headers: Record<string, string> }

function fakeFetch(respond: (url: string) => Response | Promise<Response>) {
  const calls: Call[] = []
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> })

    return respond(url)
  }

  return { fetch, calls }
}

function makeClient(fetch: FetchLike) {
  return createPostsClient({
    functionsUrl: "https://x.supabase.co/functions/v1/",
    storagePublicUrl: "https://x.supabase.co/storage/v1/object/public",
    headers: { apikey: "anon" },
    fetch
  })
}

const okCards = (cards: unknown[]) => Response.json({ success: true, data: cards })

describe("createPostsClient", () => {
  it("listPosts calls load_cards with base headers and no admin data by default", async () => {
    const { fetch, calls } = fakeFetch(() => okCards([card]))
    const result = await makeClient(fetch).listPosts()

    expect(result).toEqual({ ok: true, data: [card] })
    expect(calls).toEqual([{ url: "https://x.supabase.co/functions/v1/load_cards", headers: { apikey: "anon" } }])
  })

  it("listPosts sends include_inactive and X-Admin-Password when asked", async () => {
    const { fetch, calls } = fakeFetch(() => okCards([]))

    await makeClient(fetch).listPosts({ includeInactive: true, adminPassword: "pw" })

    expect(calls[0].url).toBe("https://x.supabase.co/functions/v1/load_cards?include_inactive=true")
    expect(calls[0].headers).toEqual({ apikey: "anon", "X-Admin-Password": "pw" })
  })

  it("listPosts filters by category case-insensitively", async () => {
    const news = { ...card, id: "2", post_type: "NEWS" }
    const { fetch } = fakeFetch(() => okCards([card, news]))
    const result = await makeClient(fetch).listPosts({ category: " news " })

    expect(result).toEqual({ ok: true, data: [news] })
  })

  it("getPost requests load_post?id and forwards the admin password", async () => {
    const { fetch, calls } = fakeFetch(() => Response.json({ success: true, data: details }))
    const client = makeClient(fetch)

    expect(await client.getPost("a b")).toEqual({ ok: true, data: details })
    await client.getPost("1", { adminPassword: "pw" })

    expect(calls[0].url).toBe("https://x.supabase.co/functions/v1/load_post?id=a+b")
    expect(calls[0].headers).toEqual({ apikey: "anon" })
    expect(calls[1].headers).toEqual({ apikey: "anon", "X-Admin-Password": "pw" })
  })

  it("getPostBySlug resolves the id from the list, then loads the post", async () => {
    const { fetch, calls } = fakeFetch((url) =>
      url.includes("load_cards") ? okCards([card]) : Response.json({ success: true, data: details })
    )
    const result = await makeClient(fetch).getPostBySlug("t", { category: "blog" })

    expect(result).toEqual({ ok: true, data: details })
    expect(calls.map((call) => call.url)).toEqual([
      "https://x.supabase.co/functions/v1/load_cards",
      "https://x.supabase.co/functions/v1/load_post?id=1"
    ])
  })

  it("getPostBySlug returns 404 POST_NOT_FOUND without loading a post", async () => {
    const { fetch, calls } = fakeFetch(() => okCards([card]))
    const result = await makeClient(fetch).getPostBySlug("missing")

    expect(result).toEqual({ ok: false, status: 404, error: "POST_NOT_FOUND" })
    expect(calls).toHaveLength(1)
  })

  it("getPostBySlug propagates a list failure", async () => {
    const { fetch } = fakeFetch(() => Response.json({ error: "INTERNAL_ERROR" }, { status: 500 }))

    expect(await makeClient(fetch).getPostBySlug("t")).toEqual({ ok: false, status: 500, error: "INTERNAL_ERROR" })
  })

  it("network errors become NETWORK_ERROR with status 0", async () => {
    const { fetch } = fakeFetch(() => {
      throw new Error("offline")
    })

    expect(await makeClient(fetch).listPosts()).toEqual({
      ok: false,
      status: 0,
      error: "NETWORK_ERROR",
      details: { message: "offline" }
    })
  })

  it("non-2xx responses pass the server error code and details through", async () => {
    const { fetch } = fakeFetch(() =>
      Response.json({ error: "POST_NOT_FOUND", details: { id: "9" } }, { status: 404 })
    )

    expect(await makeClient(fetch).getPost("9")).toEqual({
      ok: false,
      status: 404,
      error: "POST_NOT_FOUND",
      details: { id: "9" }
    })
  })

  it("non-2xx without a JSON body is INVALID_RESPONSE", async () => {
    const { fetch } = fakeFetch(() => new Response("<html>bad gateway</html>", { status: 502 }))

    expect(await makeClient(fetch).getPost("1")).toEqual({ ok: false, status: 502, error: "INVALID_RESPONSE" })
  })

  it("a 2xx payload that fails the guard is INVALID_RESPONSE", async () => {
    const { fetch } = fakeFetch(() => Response.json({ success: true, data: [{ id: 1 }] }))
    const bad = fakeFetch(() => new Response("not json"))

    expect(await makeClient(fetch).listPosts()).toEqual({ ok: false, status: 200, error: "INVALID_RESPONSE" })
    expect(await makeClient(bad.fetch).getPost("1")).toEqual({ ok: false, status: 200, error: "INVALID_RESPONSE" })
  })

  it("buildPublicUrl and resolveMarkdownAssetUrl use the default bucket", () => {
    const client = makeClient(fakeFetch(() => okCards([])).fetch)

    expect(client.buildPublicUrl("1/a b.png")).toBe("https://x.supabase.co/storage/v1/object/public/post-images/1/a%20b.png")
    expect(client.resolveMarkdownAssetUrl("https://a.com/x.png")).toBe("https://a.com/x.png")
  })
})
