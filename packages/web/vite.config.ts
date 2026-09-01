import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const monorepoRoot = resolve(__dirname, '../../')

const API_PORT = 3010
const API_TARGET = `http://127.0.0.1:${API_PORT}`

/** Rotas da API — proxy em dev (porta 3010). Manter alinhado com `packages/api/src/infrastructure/http`. */
const API_ROUTE_PATTERN =
  '^/(patients|documents|exams|exam-orders|vaccines|medications|medication-administrations|allergies|growth-records|medical-records|diagnoses|authorizations|sessions|roadmap|integration-links|scraper|plan-memberships|handwriting-credits|scheduled-events|billing|compliance|calendar|health-threads|health|auth|project|care-places|clinical-export|graph|measurements|measurement-types|care-reminders|monitoring-export|emergency|relation-types|ava|llm|hygiene|telemetry|ops)'

/** React Router paths que colidem com prefixos da API — refresh não deve ir ao backend. */
const SPA_DOCUMENT_EXACT = new Set(['/roadmap', '/compliance/accept'])
const SPA_DOCUMENT_PREFIXES = ['/patients/']

function isSpaDocumentRequest(req: { url?: string; headers: Record<string, string | string[] | undefined> }): boolean {
  const accept = String(req.headers.accept ?? '')
  const mode = String(req.headers['sec-fetch-mode'] ?? '')
  const isDocumentNavigation = mode === 'navigate' || accept.includes('text/html')
  if (!isDocumentNavigation) return false

  const path = (req.url ?? '').split('?')[0]
  if (SPA_DOCUMENT_EXACT.has(path)) return true
  return SPA_DOCUMENT_PREFIXES.some((prefix) => path.startsWith(prefix))
}

export default defineConfig({
  /** .env na raiz do monorepo (scripts/setup-env.ps1). */
  envDir: monorepoRoot,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      [API_ROUTE_PATTERN]: {
        target: API_TARGET,
        changeOrigin: true,
        bypass(req) {
          if (isSpaDocumentRequest(req)) return '/index.html'
        },
      },
    },
  },
})
