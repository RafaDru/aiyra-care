/**
 * Cria usuário QA no Supabase Auth (e-mail/senha, confirmado).
 *   npm run qa:create-test-user
 */
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { writeFileSync, existsSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { ensureQaAuthUser } from './lib/ensure-qa-auth-user.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const email =
  process.argv.find((a) => a.startsWith('--email='))?.slice('--email='.length) ??
  'qa.e2e@aiyracare.local'

const url = process.env.SUPABASE_URL?.trim()
const serviceRole = process.env.SUPABASE_SERVICE_ROLE?.trim()
if (!url || !serviceRole) {
  console.error('SUPABASE_URL e SUPABASE_SERVICE_ROLE obrigatórios no .env')
  process.exit(1)
}

/** CI: senha fixa no workflow evita corrida entre jobs paralelos no mesmo usuário Supabase. */
const password =
  process.env.QA_TEST_PASSWORD?.trim() ||
  (process.env.CI === 'true' ? 'ci-e2e-qa-test-v1' : randomBytes(18).toString('base64url'))
const admin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let userId
try {
  userId = await ensureQaAuthUser(admin, email, password)
  console.log('Usuário QA pronto (criado ou senha atualizada).')
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
}

const e2ePath = resolve(root, 'packages/web/.env.e2e.local')
const anon = process.env.VITE_SUPABASE_ANON_KEY?.trim() ?? process.env.SUPABASE_ANON_KEY?.trim() ?? ''
const existingLines = existsSync(e2ePath) ? readFileSync(e2ePath, 'utf8').split('\n') : []
const kept = existingLines.filter(
  (line) =>
    line &&
    !line.startsWith('QA_TEST_EMAIL=') &&
    !line.startsWith('QA_TEST_PASSWORD=') &&
    !line.startsWith('# qa.e2e user'),
)
const lines = [
  ...kept.filter(Boolean),
  `# qa.e2e user — ${new Date().toISOString()}`,
  `QA_TEST_EMAIL=${email}`,
  `QA_TEST_PASSWORD=${password}`,
  anon ? `VITE_SUPABASE_URL=${url}` : '',
  anon ? `VITE_SUPABASE_ANON_KEY=${anon}` : '',
].filter(Boolean)
writeFileSync(e2ePath, lines.join('\n') + '\n', 'utf8')

console.log('  email:', email)
console.log('  AUTH_SUBJECT:', userId)
console.log('  escrito:', e2ePath)
console.log('\nComplete onboarding uma vez ou use conta com perfil titular.')
