/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEPLOYMENT_TIER?: string
  readonly VITE_API_URL?: string
  readonly VITE_OPS_CONSOLE_URL?: string
  /** `1` — expose `/roadmap` in the end-user web app (default: redirect to `/`). */
  readonly VITE_INTERNAL_ROADMAP?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
