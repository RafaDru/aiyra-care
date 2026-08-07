import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const monorepoRoot = resolve(__dirname, '../../')

const API_PORT = 3010
const API_TARGET = `http://127.0.0.1:${API_PORT}`

/** Rotas da API — proxy direto em 127.0.0.1 (porta 3010; evita conflito com Next.js na 3000). */
const API_ROUTE_PATTERN =
  '^/(patients|documents|exams|vaccines|medications|allergies|growth-records|medical-records|diagnoses|authorizations|sessions|integration-links|scraper|plan-memberships|handwriting-credits|health|auth)'

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
      },
    },
  },
})
