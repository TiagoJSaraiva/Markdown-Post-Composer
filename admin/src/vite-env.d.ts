/// <reference types="vite/client" />

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
