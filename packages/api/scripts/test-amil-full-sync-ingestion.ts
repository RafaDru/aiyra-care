import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { AmilSyncScraper } from '../src/infrastructure/scraper/amil-sync.scraper.js'
import { amilResultToCanonicalBatchAsync } from '../src/application/connect/mappers/amil-canonical.mapper.js'
import { CanonicalBatchImporterService } from '../src/application/connect/canonical-batch-importer.service.js'
import { buildClassificationClassifier } from '../src/application/llm/llm-internal-cost.factory.js'
import { decrypt } from '../src/infrastructure/crypto-helper.js'
import { randomUUID } from 'crypto'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

const r = await pool.query(`SELECT * FROM integration_links WHERE portal_type = 'amil' ORDER BY updated_at DESC LIMIT 1`)
const link = r.rows[0]
const login = link.email
const password = decrypt(link.encrypted_password)

console.log('1. Executando AmilSyncScraper com novíssima captura de BuscarDemonstrativoUtilizacao...')
const scraper = new AmilSyncScraper()
const syncRes = await scraper.scrape(login, password, (p) => console.log(`   [PROGRESS] ${p.step}: ${p.message}`), { interactiveLogin: true })

console.log('\n2. Construindo classificador LlmBackedLabelClassifier...')
const classifier = buildClassificationClassifier(pool, { allowLlm: true, trigger: 'sync-test' })

console.log('\n3. Mapeando resultado Amil para lote canônico (amilResultToCanonicalBatchAsync)...')
const canonicalBatch = await amilResultToCanonicalBatchAsync(syncRes, {
  connectionId: link.id,
  jobId: randomUUID(), // Usando randomUUID para jobId
  classifier,
})

console.log(`   Total de registros canônicos gerados: ${canonicalBatch.records.length}`)
const stats = {
  beneficiaries: canonicalBatch.records.filter((r) => r.type === 'beneficiary').length,
  authorizations: canonicalBatch.records.filter((r) => r.type === 'authorization').length,
  medicalRecords: canonicalBatch.records.filter((r) => r.type === 'medical_record').length,
  exams: canonicalBatch.records.filter((r) => r.type === 'exam').length,
}
console.log('   Stats:', JSON.stringify(stats))

console.log('\n4. Ingerindo lote canônico no banco de dados via CanonicalBatchImporterService...')
const importer = new CanonicalBatchImporterService(pool)
const importRes = await importer.ingestBatch(canonicalBatch, link.patient_id, link.id)
console.log('   Resultado da ingestão:', JSON.stringify(importRes))

console.log('\n5. Verificando exames e medical_records da Amil criados no banco de dados...')
const mrCheck = await pool.query(`SELECT p.name AS patient, mr.record_type, mr.description, mr.record_date FROM medical_records mr LEFT JOIN patients p ON p.id = mr.patient_id WHERE mr.source = 'amil' ORDER BY mr.record_date DESC`)
console.log('\n=== medical_records Amil no banco ===')
for (const row of mrCheck.rows) {
  console.log(`  ${row.patient} | ${row.record_type} | ${row.description} | ${row.record_date} | mr_id: ${row.medical_record_id ?? '-'} | auth_id: ${row.authorization_id ?? '-'}`)
}

const exCheck = await pool.query(`SELECT p.name AS patient, e.exam_type, e.exam_date, e.laboratory FROM exams e LEFT JOIN patients p ON p.id = e.patient_id WHERE e.source = 'amil' ORDER BY e.exam_date DESC`)
console.log('\n=== exams Amil no banco ===')
for (const row of exCheck.rows) {
  console.log(`  ${row.patient} | ${row.exam_type} | ${row.exam_date} | ${row.laboratory} | mr_id: ${row.medical_record_id ?? '-'} | auth_id: ${row.authorization_id ?? '-'}`)
}

await pool.end()
