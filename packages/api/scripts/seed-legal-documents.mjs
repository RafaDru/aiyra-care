import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { config } from 'dotenv'
import { createHash } from 'crypto'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const REGISTRY = [
  {
    kind: 'terms_of_use',
    version: '1.0',
    title: 'Termos de Uso — AiyraCare',
    summary: 'Condições de uso da plataforma familiar; não substitui prontuário oficial.',
    contentPath: 'docs/legal/terms-of-use/v1.0.md',
    effectiveAt: '2026-08-13T00:00:00.000Z',
    requiresAcceptance: true,
  },
  {
    kind: 'privacy_policy',
    version: '1.0',
    title: 'Política de Privacidade — AiyraCare',
    summary: 'LGPD, dados sensíveis de saúde, suboperadores e direitos do titular.',
    contentPath: 'docs/legal/privacy-policy/v1.0.md',
    effectiveAt: '2026-08-13T00:00:00.000Z',
    requiresAcceptance: true,
  },
  {
    kind: 'cookie_policy',
    version: '1.0',
    title: 'Política de Cookies — AiyraCare',
    summary: 'Cookies essenciais, preferências e transparência (sem analytics de terceiros no MVP).',
    contentPath: 'docs/legal/cookie-policy/v1.0.md',
    effectiveAt: '2026-08-13T00:00:00.000Z',
    requiresAcceptance: false,
  },
  {
    kind: 'minor_guardian_consent',
    version: '1.0',
    title: 'Consentimento do responsável — menores',
    summary: 'Declaração do responsável legal ao cadastrar paciente menor de 18 anos.',
    contentPath: 'docs/legal/minor-guardian-consent/v1.0.md',
    effectiveAt: '2026-08-13T00:00:00.000Z',
    requiresAcceptance: true,
  },
]

function sha256(content) {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

for (const entry of REGISTRY) {
  const fullPath = resolve(root, entry.contentPath)
  const content = readFileSync(fullPath, 'utf8')
  const contentSha256 = sha256(content)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `UPDATE legal_documents SET is_current = false WHERE kind = $1 AND is_current = true`,
      [entry.kind],
    )
    await client.query(
      `INSERT INTO legal_documents (
         kind, version, title, summary, content_path, content_sha256,
         effective_at, is_current, requires_acceptance
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
       ON CONFLICT (kind, version) DO UPDATE SET
         title = EXCLUDED.title,
         summary = EXCLUDED.summary,
         content_path = EXCLUDED.content_path,
         content_sha256 = EXCLUDED.content_sha256,
         effective_at = EXCLUDED.effective_at,
         is_current = true,
         requires_acceptance = EXCLUDED.requires_acceptance,
         published_at = NOW()`,
      [
        entry.kind,
        entry.version,
        entry.title,
        entry.summary,
        entry.contentPath,
        contentSha256,
        entry.effectiveAt,
        entry.requiresAcceptance,
      ],
    )
    await client.query('COMMIT')
    console.log(`published ${entry.kind} v${entry.version} sha256=${contentSha256.slice(0, 12)}…`)
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

await pool.end()
console.log('legal documents seeded')
