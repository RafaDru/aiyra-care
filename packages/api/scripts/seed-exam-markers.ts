import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/openhealth',
})

async function run() {
  const { rows: patients } = await pool.query(`SELECT id, name FROM patients ORDER BY name`)
  if (!patients.length) {
    console.log('Nenhum paciente encontrado.')
    await pool.end()
    return
  }

  const rafael = patients.find((p) => p.name.includes('Rafael')) ?? patients[0]
  console.log(`Semeando marcadores para o paciente: ${rafael.name} (${rafael.id})`)

  const { rows: exams } = await pool.query(
    `SELECT id, exam_type, exam_date FROM exams WHERE patient_id = $1 ORDER BY exam_date DESC`,
    [rafael.id],
  )

  const exam1Id = exams[0]?.id ?? '00000000-0000-0000-0000-000000000001'
  const exam2Id = exams[1]?.id ?? exam1Id

  const sampleMarkers = [
    {
      exam_id: exam1Id,
      patient_id: rafael.id,
      marker_name: 'Glicose de Jejum',
      technical_name: 'Glicemia em soro/plasma - TUSS 40302016',
      numeric_value: 92.0,
      display_value: '92.0',
      unit: 'mg/dL',
      reference_range: '70 a 99 mg/dL',
      status: 'normal',
      collected_at: '2026-08-09T08:00:00Z',
    },
    {
      exam_id: exam2Id,
      patient_id: rafael.id,
      marker_name: 'Glicose de Jejum',
      technical_name: 'Glicemia em soro/plasma - TUSS 40302016',
      numeric_value: 88.5,
      display_value: '88.5',
      unit: 'mg/dL',
      reference_range: '70 a 99 mg/dL',
      status: 'normal',
      collected_at: '2025-12-15T08:00:00Z',
    },
    {
      exam_id: exam1Id,
      patient_id: rafael.id,
      marker_name: 'Hemoglobina Glicada',
      technical_name: 'HbA1c por HPLC - TUSS 40302040',
      numeric_value: 5.4,
      display_value: '5.4',
      unit: '%',
      reference_range: '4.0 a 5.6 %',
      status: 'normal',
      collected_at: '2026-08-09T08:00:00Z',
    },
    {
      exam_id: exam1Id,
      patient_id: rafael.id,
      marker_name: 'Proteína C Reativa',
      technical_name: 'PCR Ultrassensível - TUSS 40304361',
      numeric_value: 0.3,
      display_value: '0.3',
      unit: 'mg/L',
      reference_range: 'até 1.0 mg/L',
      status: 'normal',
      collected_at: '2026-08-09T08:00:00Z',
    },
    {
      exam_id: exam1Id,
      patient_id: rafael.id,
      marker_name: 'Vitamina D (25-OH)',
      technical_name: '25-Hidroxivitamina D - TUSS 40316388',
      numeric_value: 34.2,
      display_value: '34.2',
      unit: 'ng/mL',
      reference_range: '20 a 50 ng/mL',
      status: 'normal',
      collected_at: '2026-08-09T08:00:00Z',
    },
    {
      exam_id: exam1Id,
      patient_id: rafael.id,
      marker_name: 'TSH Ultrassensível',
      technical_name: 'Hormônio Tireoestimulante - TUSS 40316523',
      numeric_value: 2.1,
      display_value: '2.1',
      unit: 'mIU/L',
      reference_range: '0.4 a 4.5 mIU/L',
      status: 'normal',
      collected_at: '2026-08-09T08:00:00Z',
    },
  ]

  for (const m of sampleMarkers) {
    await pool.query(
      `INSERT INTO exam_result_items (
         exam_id, patient_id, marker_name, technical_name,
         numeric_value, display_value, unit, reference_range,
         status, collected_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT DO NOTHING`,
      [
        m.exam_id,
        m.patient_id,
        m.marker_name,
        m.technical_name,
        m.numeric_value,
        m.display_value,
        m.unit,
        m.reference_range,
        m.status,
        m.collected_at,
      ],
    )
  }

  console.log('Marcadores semeados com sucesso!')
  await pool.end()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
