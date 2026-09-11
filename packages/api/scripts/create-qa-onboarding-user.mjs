/**
 * Conta dedicada ao fluxo de onboarding repetível.
 *   npm run qa:create-onboarding-user
 */
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { writeFileSync, existsSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const email = 'qa.onboarding@aiyracare.local'
const url = process.env.SUPABASE_URL?.trim()
const serviceRole = process.env.SUPABASE_SERVICE_ROLE?.trim()
if (!url || !serviceRole) {
  console.error('SUPABASE_URL e SUPABASE_SERVICE_ROLE obrigatórios no .env')
  process.exit(1)
}

const password =
  process.env.QA_ONBOARDING_PASSWORD?.trim() ||
  (process.env.CI === 'true' ? 'ci-e2e-qa-onboarding-v1' : randomBytes(18).toString('base64url'))
const admin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
const existing = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())

let userId
if (existing) {
  const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  })
  if (error) {
    console.error('updateUserById:', error.message)
    process.exit(1)
  }
  userId = data.user.id
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) {
    console.error('createUser:', error.message)
    process.exit(1)
  }
  userId = data.user.id
}

const e2ePath = resolve(root, 'packages/web/.env.e2e.local')
const anon = process.env.VITE_SUPABASE_ANON_KEY?.trim() ?? process.env.SUPABASE_ANON_KEY?.trim() ?? ''
const existingLines = existsSync(e2ePath) ? readFileSync(e2ePath, 'utf8').split('\n') : []
const kept = existingLines.filter(
  (line) =>
    line &&
    !line.startsWith('QA_ONBOARDING_') &&
    !line.startsWith('# onboarding user'),
)
const lines = [
  ...kept.filter(Boolean),
  `# onboarding user — ${new Date().toISOString()}`,
  `QA_ONBOARDING_EMAIL=${email}`,
  `QA_ONBOARDING_PASSWORD=${password}`,
  `QA_ONBOARDING_AUTH_SUBJECT=${userId}`,
  anon ? `VITE_SUPABASE_URL=${url}` : '',
  anon ? `VITE_SUPABASE_ANON_KEY=${anon}` : '',
].filter(Boolean)
writeFileSync(e2ePath, lines.join('\n') + '\n', 'utf8')

console.log('  email:', email)
console.log('  AUTH_SUBJECT:', userId)
console.log('  escrito:', e2ePath)
