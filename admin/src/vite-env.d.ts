/*
 * Type declarations for the Vite client and for the `VITE_MDPC_*` variables the
 * admin reads (see config/env.ts).
 */
/// <reference types="vite/client" />

/**
 * Build-time environment variables of the admin; every one is optional here and
 * validated at runtime by parseEnv.
 */
interface ImportMetaEnv {
  readonly VITE_MDPC_FUNCTIONS_URL?: string
  readonly VITE_MDPC_STORAGE_PUBLIC_URL?: string
  readonly VITE_MDPC_POSTS_BUCKET?: string
  readonly VITE_MDPC_POST_CATEGORIES?: string
  readonly VITE_MDPC_LOCALE?: string
  readonly VITE_MDPC_SITE_URL?: string
  readonly VITE_MDPC_APP_TITLE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
