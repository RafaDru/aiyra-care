/**
 * Normaliza artefatos de exame (PDF/DOC/PPT) → medidas canônicas.
 * Usage: npx tsx packages/api/scripts/run-exam-artifact-normalize.ts <patientId>
 */
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { ExamArtifactNormalizationService } from '../src/application/exam/exam-artifact-normalization.service.js'
import { ExamPgRepository } from '../src/infrastructure/persistence/exam.pg.repository.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const patientId = process.argv[2]
if (!patientId) {
  console.error('Usage: npx tsx packages/api/scripts/run-exam-artifact-normalize.ts <patientId>')
  process.exit(1)
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/openhealth',
})

const service = new ExamArtifactNormalizationService(pool, new ExamPgRepository(pool))
const result = await service.normalizeForPatient(patientId)
console.log(JSON.stringify(result, null, 2))
await pool.end()
