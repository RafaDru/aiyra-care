/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEPLOYMENT_TIER?: string
  readonly VITE_API_URL?: string
  readonly VITE_OPS_CONSOLE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
