#!/usr/bin/env node
// End-to-end smoke test for a running MDPostComposer stack.
//
//   MDPC_FUNCTIONS_URL=http://127.0.0.1:54321/functions/v1 \
//   MDPC_ADMIN_PASSWORD=change-me \
//   node scripts/smoke/smoke.mjs
//
// Optional: MDPC_SMOKE_CATEGORY (default BLOG; must be in MDPC_POST_CATEGORIES)
//           MDPC_POSTS_BUCKET   (default post-images; only used to check the banner URL)
//
// Requires Node 20+. No dependencies. Exits with code 1 if any step fails.

import { readFile } from "node:fs/promises"

const FUNCTIONS_URL = (process.env.MDPC_FUNCTIONS_URL ?? "").replace(/\/+$/, "")
const PASSWORD = process.env.MDPC_ADMIN_PASSWORD ?? ""
const CATEGORY = process.env.MDPC_SMOKE_CATEGORY || "BLOG"
const POSTS_BUCKET = process.env.MDPC_POSTS_BUCKET || "post-images"
const AUTH = { "X-Admin-Password": PASSWORD }

if (!FUNCTIONS_URL || !PASSWORD) {
  console.error("Set MDPC_FUNCTIONS_URL and MDPC_ADMIN_PASSWORD before running the smoke test.")
  process.exit(2)
}

const imageFile = async (name) =>
  new Blob([await readFile(new URL(`./${name}`, import.meta.url))], { type: "image/jpeg" })

async function call(fn, { method = "GET", query, headers = AUTH, body, json } = {}) {
  const qs = query ? `?${new URLSearchParams(query)}` : ""
  const init = { method, headers: { ...headers } }

  if (json !== undefined) {
    init.headers["Content-Type"] = "application/json"
    init.body = JSON.stringify(json)
  } else if (body) {
    init.body = body
  }

  const res = await fetch(`${FUNCTIONS_URL}/${fn}${qs}`, init)
  const data = await res.json().catch(() => null)

  return { status: res.status, data }
}

async function postForm({ id, title, preview, markdown, active, withBanner }) {
  const form = new FormData()

  if (id) form.append("id", id)
  form.append("category", CATEGORY)
  form.append("title", title)
  form.append("preview", preview)
  form.append("content_markdown", markdown)
  form.append("active", String(active))
  if (withBanner) form.append("banner", await imageFile("banner.jpg"), "banner.jpg")
  form.append("images", await imageFile("image1.jpg"), "image1.jpg")

  return form
}

let failures = 0

async function step(name, fn) {
  try {
    await fn()
    console.log(`PASS  ${name}`)
  } catch (error) {
    failures += 1
    console.log(`FAIL  ${name}\n      ${error instanceof Error ? error.message : error}`)
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message)
}

function expectStatus(res, status, error) {
  expect(
    res.status === status && (!error || res.data?.error === error),
    `expected ${status}${error ? ` ${error}` : ""}, got ${res.status} ${JSON.stringify(res.data)}`
  )
}

const title = `Smoke test ${new Date().toISOString().replace(/\D/g, "").slice(0, 17)}`
const markdown = "# Smoke test\n\nBody text.\n\n![content image](image1)\n"
let postId = null
let tempPath = null

try {
  await step("create_post (banner + content image)", async () => {
    const form = await postForm({ title, preview: "Smoke preview", markdown, active: true, withBanner: true })
    const res = await call("create_post", { method: "POST", body: form })

    expectStatus(res, 200)
    expect(res.data?.success === true && typeof res.data.id === "string", `unexpected body ${JSON.stringify(res.data)}`)
    postId = res.data.id
  })

  if (postId) {
    await step("load_cards lists the new post", async () => {
      const res = await call("load_cards", { headers: {} })

      expectStatus(res, 200)
      const card = res.data?.data?.find((item) => item.id === postId)
      expect(card, "post not found in the public list")
      expect(card.title === title && card.active === true, `unexpected card ${JSON.stringify(card)}`)
    })

    await step("load_post returns the rewritten image path", async () => {
      const res = await call("load_post", { query: { id: postId }, headers: {} })

      expectStatus(res, 200)
      expect(
        res.data.data.content_markdown.includes(`(${postId}/image1.jpg)`),
        `markdown not rewritten: ${res.data.data.content_markdown}`
      )
      expect(res.data.data.image_paths.includes(`${postId}/image1.jpg`), "image_paths is missing image1.jpg")
      expect(res.data.data.banner_path.startsWith(`${postId}/banner_`), `unexpected banner_path ${res.data.data.banner_path}`)
    })

    if (FUNCTIONS_URL.endsWith("/functions/v1")) {
      await step("uploaded image is publicly readable", async () => {
        const base = FUNCTIONS_URL.replace(/\/functions\/v1$/, "")
        const res = await fetch(`${base}/storage/v1/object/public/${POSTS_BUCKET}/${postId}/image1.jpg`)

        expect(res.status === 200, `expected 200, got ${res.status}`)
      })
    }

    await step("update_post (new title, active=false)", async () => {
      const form = await postForm({
        id: postId,
        title: `${title} updated`,
        preview: "Smoke preview updated",
        markdown,
        active: false,
        withBanner: false
      })
      const res = await call("update_post", { method: "PUT", body: form })

      expectStatus(res, 200)
      expect(res.data?.success === true, `unexpected body ${JSON.stringify(res.data)}`)
    })

    await step("inactive post: public load_post 404, admin load_post 200", async () => {
      expectStatus(await call("load_post", { query: { id: postId }, headers: {} }), 404, "POST_NOT_FOUND")

      const res = await call("load_post", { query: { id: postId } })

      expectStatus(res, 200)
      expect(res.data.data.title === `${title} updated` && res.data.data.active === false, "update was not applied")
    })

    await step("inactive post is hidden from the public list only", async () => {
      const publicList = await call("load_cards", { headers: {} })
      const adminList = await call("load_cards", { query: { include_inactive: "true" } })

      expectStatus(publicList, 200)
      expectStatus(adminList, 200)
      expect(!publicList.data.data.some((item) => item.id === postId), "inactive post leaked into the public list")
      expect(adminList.data.data.some((item) => item.id === postId), "inactive post missing from the admin list")
    })

    await step("duplicate title returns 409", async () => {
      const form = await postForm({ title: `${title} updated`, preview: "dup", markdown, active: true, withBanner: true })

      expectStatus(await call("create_post", { method: "POST", body: form }), 409, "TITLE_OR_SLUG_ALREADY_EXISTS")
    })
  }

  await step("wrong password returns 401", async () => {
    const res = await call("create_post", {
      method: "POST",
      headers: { "X-Admin-Password": `${PASSWORD}-wrong` },
      body: await postForm({ title: `${title} nope`, preview: "x", markdown, active: true, withBanner: true })
    })

    expectStatus(res, 401, "WRONG_PASSWORD")
  })

  await step("temp_images upload, list and delete", async () => {
    const form = new FormData()

    form.append("file", await imageFile("image2.jpg"), "image2.jpg")
    form.append("name", "smoke_image2")

    const upload = await call("temp_images", { method: "POST", body: form })

    expectStatus(upload, 200)
    tempPath = upload.data.data.path
    expect(upload.data.data.name === "smoke_image2", `unexpected name ${upload.data.data.name}`)

    const list = await call("temp_images")

    expectStatus(list, 200)
    expect(list.data.data.some((item) => item.path === tempPath), "uploaded temp image missing from the list")

    const del = await call("temp_images", { method: "DELETE", json: { path: tempPath } })

    expectStatus(del, 200)
    expect(del.data.data.deleted === 1, `expected deleted=1, got ${JSON.stringify(del.data)}`)
    tempPath = null

    const after = await call("temp_images")

    expect(!after.data.data.some((item) => item.name === "smoke_image2"), "temp image still listed after delete")
  })

  if (postId) {
    const id = postId

    await step("delete_post", async () => {
      expectStatus(await call("delete_post", { method: "DELETE", json: { id } }), 200)
      postId = null
    })

    await step("load_post after delete returns 404", async () => {
      expectStatus(await call("load_post", { query: { id } }), 404, "POST_NOT_FOUND")
    })
  }
} finally {
  // Best-effort cleanup of anything a failed step left behind.
  if (tempPath) {
    await call("temp_images", { method: "DELETE", json: { path: tempPath } }).catch(() => {})
  }

  if (postId) {
    const res = await call("delete_post", { method: "DELETE", json: { id: postId } }).catch(() => null)

    console.log(`cleanup: delete_post ${postId} -> ${res ? res.status : "request failed"}`)
  }
}

console.log(failures === 0 ? "\nAll steps passed." : `\n${failures} step(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
