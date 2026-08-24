import pg from 'pg'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/openhealth',
})

async function main() {
  // 1. Pacientes
  const { rows: patients } = await pool.query<{ id: string; name: string }>(
    `SELECT id, name FROM patients WHERE name ILIKE ANY(ARRAY['%rafael%','%luís%','%luis%','%jenifer%','%bruno%']) ORDER BY name`,
  )

  console.log('=== PACIENTES ENCONTRADOS ===')
  for (const p of patients) console.log(`${p.name} (${p.id.slice(0, 8)})`)

  for (const p of patients) {
    console.log(`\n${'='.repeat(70)}`)
    console.log(`👤 ${p.name}`)
    console.log('='.repeat(70))

    // Documentos PDF por origem (filename)
    const { rows: docs } = await pool.query<{ total: number; with_text: number; pdf: number; images: number }>(
      `SELECT COUNT(*)::int AS total,
              COUNT(NULLIF(extracted_text, ''))::int AS with_text,
              COUNT(*) FILTER (WHERE mime_type ILIKE '%pdf%' OR original_filename ILIKE '%.pdf')::int AS pdf,
              COUNT(*) FILTER (WHERE mime_type ILIKE '%image%')::int AS images
         FROM documents WHERE patient_id = $1`,
      [p.id],
    )
    const d = docs[0]
    console.log(`📄 Documentos: ${d.total} | com texto extraído: ${d.with_text} | PDFs: ${d.pdf} | Imagens: ${d.images}`)

    // Origem dos documentos (prefixo do filename)
    const { rows: sources } = await pool.query<{ source: string; n: number; with_text: number }>(
      `SELECT CASE
                WHEN original_filename ILIKE 'materdei%' THEN 'Mater Dei'
                WHEN original_filename ILIKE '%hermes%' OR original_filename ILIKE '%pardini%' THEN 'Hermes Pardini'
                WHEN original_filename ILIKE '%unimed%' THEN 'Unimed'
                WHEN original_filename ILIKE '%amil%' THEN 'Amil'
                ELSE 'Outros'
              END AS source,
              COUNT(*)::int AS n,
              COUNT(NULLIF(extracted_text, ''))::int AS with_text
         FROM documents WHERE patient_id = $1 GROUP BY 1 ORDER BY n DESC`,
      [p.id],
    )
    for (const s of sources) console.log(`   • ${s.source}: ${s.n} docs (${s.with_text} com texto)`)

    // Marcadores persistidos
    const { rows: markers } = await pool.query<{ marker_name: string; n: number }>(
      `SELECT marker_name, COUNT(*)::int AS n FROM exam_result_items WHERE patient_id = $1 GROUP BY 1 ORDER BY n DESC`,
      [p.id],
    )
    if (markers.length === 0) {
      console.log(`🧪 Marcadores em exam_result_items: NENHUM`)
    } else {
      const total = markers.reduce((a, b) => a + b.n, 0)
      console.log(`🧪 Marcadores: ${total} linhas, ${markers.length} tipos:`)
      for (const m of markers) console.log(`   • ${m.marker_name}: ${m.n}x`)
    }

    // Exames na entidade exams
    const { rows: exams } = await pool.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM exams WHERE patient_id = $1`,
      [p.id],
    )
    console.log(`🔬 Registros na entidade exams: ${exams[0].n}`)
  }

  await pool.end()
}

main().catch(console.error)