/*
 * Deno tests for _lib/config.ts (defaults, validation, memoization).
 */
import { assert, assertEquals } from "@std/assert"

const VARS = [
  "MDPC_ADMIN_PASSWORD",
  "MDPC_ALLOWED_ORIGINS",
  "MDPC_POST_CATEGORIES",
  "MDPC_POSTS_BUCKET",
  "MDPC_TEMP_BUCKET",
  "MDPC_PUBLIC_STORAGE_URL"
]

type ConfigModule = typeof import("../_lib/config.ts")

let counter = 0

// config.ts memoizes; a unique query string loads a fresh module instance.
async function loadFresh(): Promise<ConfigModule> {
  return await import(`../_lib/config.ts?fresh=${++counter}`)
}

async function withEnv(env: Record<string, string>, fn: () => Promise<void>): Promise<void> {
  const saved = VARS.map((name) => [name, Deno.env.get(name)] as const)

  for (const name of VARS) Deno.env.delete(name)
  for (const [name, value] of Object.entries(env)) Deno.env.set(name, value)

  try {
    await fn()
  } finally {
    for (const [name, value] of saved) {
      if (value === undefined) Deno.env.delete(name)
      else Deno.env.set(name, value)
    }
  }
}

async function configErrorVariable(env: Record<string, string>): Promise<string> {
  let variable = ""

  await withEnv(env, async () => {
    const { getConfig, ConfigError } = await loadFresh()

    try {
      getConfig()
    } catch (error) {
      assert(error instanceof ConfigError)
      variable = error.variable
    }
  })

  return variable
}

Deno.test("getConfig applies defaults", async () => {
  await withEnv({ MDPC_ADMIN_PASSWORD: "  secret  " }, async () => {
    const { getConfig } = await loadFresh()

    assertEquals(getConfig(), {
      adminPassword: "secret",
      allowedOrigins: [],
      categories: ["BLOG"],
      postsBucket: "post-images",
      tempBucket: "temp",
      publicStorageUrl: null
    })
  })
})

Deno.test("getConfig requires a non-empty password", async () => {
  assertEquals(await configErrorVariable({}), "MDPC_ADMIN_PASSWORD")
  assertEquals(await configErrorVariable({ MDPC_ADMIN_PASSWORD: "   " }), "MDPC_ADMIN_PASSWORD")
})

Deno.test("getConfig normalizes and de-duplicates origins", async () => {
  await withEnv({
    MDPC_ADMIN_PASSWORD: "x",
    MDPC_ALLOWED_ORIGINS: " https://a.example.com/ , http://localhost:5173/path,https://a.example.com,, "
  }, async () => {
    const { getConfig } = await loadFresh()

    assertEquals(getConfig().allowedOrigins, ["https://a.example.com", "http://localhost:5173"])
  })
})

Deno.test("getConfig rejects invalid origins", async () => {
  for (const origin of ["admin.example.com", "ftp://a.example.com", "not a url"]) {
    assertEquals(
      await configErrorVariable({ MDPC_ADMIN_PASSWORD: "x", MDPC_ALLOWED_ORIGINS: origin }),
      "MDPC_ALLOWED_ORIGINS",
      origin
    )
  }
})

Deno.test("getConfig upper-cases categories and rejects invalid names", async () => {
  await withEnv({ MDPC_ADMIN_PASSWORD: "x", MDPC_POST_CATEGORIES: "blog, news_1,BLOG" }, async () => {
    const { getConfig } = await loadFresh()

    assertEquals(getConfig().categories, ["BLOG", "NEWS_1"])
  })

  assertEquals(
    await configErrorVariable({ MDPC_ADMIN_PASSWORD: "x", MDPC_POST_CATEGORIES: "ok,bad name" }),
    "MDPC_POST_CATEGORIES"
  )
})

Deno.test("getConfig reads bucket overrides and ignores blank ones", async () => {
  await withEnv({ MDPC_ADMIN_PASSWORD: "x", MDPC_POSTS_BUCKET: " imgs ", MDPC_TEMP_BUCKET: " " }, async () => {
    const { getConfig } = await loadFresh()
    const config = getConfig()

    assertEquals(config.postsBucket, "imgs")
    assertEquals(config.tempBucket, "temp")
  })
})

Deno.test("getConfig memoizes success but does not cache failures", async () => {
  await withEnv({}, async () => {
    const { getConfig } = await loadFresh()

    let failed = false

    try {
      getConfig()
    } catch {
      failed = true
    }

    assert(failed)

    Deno.env.set("MDPC_ADMIN_PASSWORD", "first")
    const first = getConfig()

    Deno.env.set("MDPC_ADMIN_PASSWORD", "second")
    assert(getConfig() === first)
  })
})

Deno.test("getConfig trims the public storage URL and rejects invalid ones", async () => {
  await withEnv(
    { MDPC_ADMIN_PASSWORD: "x", MDPC_PUBLIC_STORAGE_URL: " http://127.0.0.1:54321/storage/v1/object/public/ " },
    async () => {
      const { getConfig } = await loadFresh()

      assertEquals(getConfig().publicStorageUrl, "http://127.0.0.1:54321/storage/v1/object/public")
    }
  )

  assertEquals(
    await configErrorVariable({ MDPC_ADMIN_PASSWORD: "x", MDPC_PUBLIC_STORAGE_URL: "kong:8000" }),
    "MDPC_PUBLIC_STORAGE_URL"
  )
})
