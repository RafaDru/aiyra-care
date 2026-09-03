import pg from 'pg'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare',
})

// 1. Pacientes e contagens gerais
const patients = await pool.query(`
  SELECT p.id, p.name, p.birth_date::date,
    (SELECT COUNT(*)::int FROM exams e WHERE e.patient_id = p.id) AS exams,
    (SELECT COUNT(*)::int FROM exams e WHERE e.patient_id = p.id AND e.result_summary IS NOT NULL AND e.result_summary <> '') AS exams_with_result,
    (SELECT COUNT(*)::int FROM exams e WHERE e.patient_id = p.id AND e.result_file_url IS NOT NULL) AS exams_with_file,
    (SELECT COUNT(*)::int FROM exams e WHERE e.patient_id = p.id AND e.notes LIKE '%hygieneCanonicalId%') AS exams_dup,
    (SELECT COUNT(*)::int FROM vaccines v WHERE v.patient_id = p.id) AS vaccines,
    (SELECT COUNT(*)::int FROM vaccines v WHERE v.patient_id = p.id AND v.notes LIKE '%hygieneCanonicalId%') AS vaccines_dup,
    (SELECT COUNT(*)::int FROM documents d WHERE d.patient_id = p.id) AS documents,
    (SELECT COUNT(*)::int FROM documents d WHERE d.patient_id = p.id AND d.extracted_text IS NOT NULL AND d.extracted_text <> '') AS docs_with_ocr,
    (SELECT COUNT(*)::int FROM measurement_observations m WHERE m.patient_id = p.id AND m.source_ref LIKE 'exam:%') AS measurements_from_exams
  FROM patients p
  WHERE p.owner_account_id IS NOT NULL OR EXISTS (SELECT 1 FROM patient_memberships pm WHERE pm.patient_id = p.id)
  ORDER BY p.name
`)

console.log('=== PACIENTES ===')
for (const p of patients.rows) {
  console.log(
    `${p.name} | exams=${p.exams} (result=${p.exams_with_result}, file=${p.exams_with_file}, dup=${p.exams_dup}) | vacinas=${p.vaccines} (dup=${p.vaccines_dup}) | docs=${p.documents} (ocr=${p.docs_with_ocr}) | medidasExam=${p.measurements_from_exams}`,
  )
}

// 2. Exames com artefato e sem resultado (candidatos a normalização)
const artifacts = await pool.query(`
  SELECT e.patient_id, p.name AS patient_name, COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE e.result_summary IS NOT NULL AND e.result_summary <> '') AS with_result,
    COUNT(*) FILTER (WHERE e.result_file_url IS NOT NULL) AS with_file,
    COUNT(*) FILTER (WHERE e.notes LIKE '%documentId%') AS with_document,
    COUNT(*) FILTER (WHERE e.notes LIKE '%hygieneCanonicalId%') AS is_dup
  FROM exams e JOIN patients p ON p.id = e.patient_id
  GROUP BY e.patient_id, p.name ORDER BY total DESC
`)
console.log('\n=== EXAMES POR PACIENTE ===')
for (const r of artifacts.rows) {
  console.log(
    `${r.patient_name} | total=${r.total} result=${r.with_result} file=${r.with_file} doc=${r.with_document} dup=${r.is_dup}`,
  )
}

// 3. Amostra de exames sem resultado mas com artefato (PDF) — por paciente, agrupado
const pending = await pool.query(`
  SELECT p.name AS patient_name, e.id, e.exam_type, TO_CHAR(e.exam_date, 'YYYY-MM-DD') AS exam_date,
    e.source, e.laboratory, e.result_summary, e.notes
  FROM exams e JOIN patients p ON p.id = e.patient_id
  WHERE e.notes NOT LIKE '%hygieneCanonicalId%'
    AND (e.result_file_url IS NOT NULL OR e.notes LIKE '%documentId%')
    AND (e.result_summary IS NULL OR e.result_summary = '' OR e.result_summary IN ('FULL','WAIT'))
  ORDER BY p.name, e.exam_date DESC
`)
console.log('\n=== EXAMES COM ARQUIVO/DOC SEM RESULTADO NORMALIZADO ===')
for (const r of pending.rows) {
  const hasDoc = r.notes && r.notes.includes('documentId')
  console.log(
    `${r.patient_name} | ${r.exam_date} | ${String(r.exam_type).slice(0, 45)} | src=${r.source} | resumo=${r.result_summary ?? 'NULL'} | file=${r.result_file_url ? 'sim' : 'não'} | docId=${hasDoc ? 'sim' : 'não'}`,
  )
}
console.log(`(total na lista acima: ${pending.rows.length})`)

// 3b. Buckets de normalização por fonte
const buckets = await pool.query(`
  SELECT e.source,
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE e.result_summary IS NULL OR e.result_summary = '' OR e.result_summary IN ('FULL','WAIT')) AS pendente,
    COUNT(*) FILTER (WHERE (e.result_file_url IS NOT NULL OR e.notes LIKE '%documentId%')) AS com_artefato,
    COUNT(*) FILTER (WHERE (e.notes LIKE '%documentId%') AND e.notes NOT LIKE '%hygieneCanonicalId%') AS artefato_valido
  FROM exams e GROUP BY e.source ORDER BY total DESC
`)
console.log('\n=== BUCKETS POR FONTE ===')
for (const r of buckets.rows) {
  console.log(
    `${r.source} | total=${r.total} pendente=${r.pendente} com_artefato=${r.com_artefato} artefato_valido=${r.artefato_valido}`,
  )
}

// 4. Documentos com OCR e tipos
const docTypes = await pool.query(`
  SELECT document_type, COUNT(*)::int AS n,
    COUNT(*) FILTER (WHERE extracted_text IS NOT NULL AND extracted_text <> '') AS with_text,
    COUNT(*) FILTER (WHERE ocr_processed) AS ocr_done,
    COUNT(*) FILTER (WHERE mime_type LIKE '%pdf%') AS pdf
  FROM documents GROUP BY document_type ORDER BY n DESC
`)
console.log('\n=== DOCUMENTOS POR TIPO ===')
for (const r of docTypes.rows) {
  console.log(
    `${r.document_type} | total=${r.n} texto=${r.with_text} ocr=${r.ocr_done} pdf=${r.pdf}`,
  )
}

// 5. Medidas vindas de exames por tipo
const measures = await pool.query(`
  SELECT m.type_code, COUNT(*)::int AS n, COUNT(DISTINCT m.patient_id) AS patients
  FROM measurement_observations m
  WHERE m.source_ref LIKE 'exam:%'
  GROUP BY m.type_code ORDER BY n DESC
`)
console.log('\n=== MEDIDAS IMPORTADAS DE EXAMES ===')
for (const r of measures.rows) {
  console.log(`${r.type_code} | ${r.n} | pacientes=${r.patients}`)
}

// 6. Candidatos de higienização pendentes
const cand = await pool.query(`
  SELECT entity_type, detector, COUNT(*)::int AS n
  FROM hygiene_candidates WHERE status = 'pending'
  GROUP BY entity_type, detector ORDER BY n DESC
`)
console.log('\n=== CANDIDATOS PENDENTES (higienização) ===')
if (cand.rows.length === 0) console.log('(nenhum)')
for (const r of cand.rows) {
  console.log(`${r.entity_type} | ${r.detector} | ${r.n}`)
}

// 7. Distribuição de exames por tipo (top, normalizáveis)
const topTypes = await pool.query(`
  SELECT exam_type, COUNT(*)::int AS n,
    COUNT(*) FILTER (WHERE notes LIKE '%hygieneCanonicalId%') AS dup
  FROM exams GROUP BY exam_type ORDER BY n DESC LIMIT 25
`)
console.log('\n=== TIPOS DE EXAME MAIS FREQUENTES ===')
for (const r of topTypes.rows) {
  console.log(`${r.exam_type?.slice(0, 60)} | ${r.n} (dup=${r.dup})`)
}

// 8. Contagem exames com notes meta pedidoId/examOrderId
const orders = await pool.query(`
  SELECT COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE exam_order_id IS NOT NULL) AS with_order
  FROM exams
`)
console.log('\n=== EXAMES COM PEDIDO ===', JSON.stringify(orders.rows[0]))

await pool.end()
