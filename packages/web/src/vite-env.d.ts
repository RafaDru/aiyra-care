/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEPLOYMENT_TIER?: string
  readonly VITE_API_URL?: string
  readonly VITE_OPS_CONSOLE_URL?: string
  /** `1` — expose `/roadmap` in the end-user web app (default: redirect to `/`). */
  readonly VITE_INTERNAL_ROADMAP?: string
  /** Canonical site origin for SEO (e.g. https://aiyracare.com). Falls back to window.location.origin. */
  readonly VITE_PUBLIC_SITE_URL?: string
  /** Optional static fallback when API publisher is incomplete (mirrors LEGAL_ENTITY_NAME). */
  readonly VITE_LEGAL_ENTITY_NAME?: string
  /** Optional static fallback when API publisher is incomplete (mirrors LEGAL_CNPJ, digits only). */
  readonly VITE_LEGAL_CNPJ?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
