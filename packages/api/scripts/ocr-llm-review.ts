/**
 * Manual OCR review with LLM — NOT part of the product upload path.
 *
 * Use when ocr-stats show low parseOk / high usedPaid, to learn how to improve
 * Python preprocessing and the identity parser.
 *
 * Usage:
 *   npx tsx scripts/ocr-llm-review.ts --text-file path/to/ocr.txt --type certidao_nascimento
 *   npx tsx scripts/ocr-llm-review.ts --document-id <uuid>
 */
import { readFileSync } from 'fs'
import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config({ path: new URL('../../../.env', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1') })
dotenv.config({ path: 'C:/Users/rafae/Documents/Filhos/.env' })

import { GroqLlmAdapter } from '../src/infrastructure/llm/groq-llm.adapter.ts'
import { parseIdentityDocument } from '../src/domain/document/identity-document.parser.ts'
import { scoreOcrText } from '../src/domain/document/ocr-quality.ts'
import { evaluateIdentityParse } from '../src/application/document/ocr-quality.ts'

const args = process.argv.slice(2)
function arg(name: string) {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

const SYSTEM = `Você analisa texto OCR de documentos brasileiros para melhorar ALGORITMOS locais (Tesseract + parser).
NÃO é produção. Dado o OCR e o parse heurístico, responda JSON:
{
  "correctedFields": {"name":"","cpf":"","birthDate":"YYYY-MM-DD","motherName":"","fatherName":"","sex":""},
  "ocrIssues": ["..."],
  "algorithmImprovements": ["mudanças concretas no preprocessamento Python ou no parser por label"],
  "summary": "1-2 frases"
}`

async function loadText(): Promise<{ text: string; documentType: string }> {
  const type = arg('--type') || 'certidao_nascimento'
  const textFile = arg('--text-file')
  if (textFile) return { text: readFileSync(textFile, 'utf8'), documentType: type }

  const docId = arg('--document-id')
  if (!docId) {
    console.error('Use --text-file <path> or --document-id <uuid>')
    process.exit(1)
  }
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const { rows } = await pool.query(
    'SELECT extracted_text, document_type FROM documents WHERE id = $1',
    [docId],
  )
  await pool.end()
  if (!rows.length || !rows[0].extracted_text) {
    console.error('Document not found or empty OCR text')
    process.exit(1)
  }
  return { text: rows[0].extracted_text, documentType: rows[0].document_type }
}

const { text, documentType } = await loadText()
const heuristic = parseIdentityDocument(text, documentType)
const metrics = evaluateIdentityParse(documentType, text).metrics
const quality = scoreOcrText(text)

console.log('=== Local metrics ===')
console.log({ quality, metrics, heuristic })

const llm = new GroqLlmAdapter()
const review = await llm.extractJson(SYSTEM, `Tipo: ${documentType}\n\nParse heurístico: ${JSON.stringify(heuristic)}\n\nOCR:\n${text.slice(0, 6000)}`)
console.log('\n=== LLM review (manual / offline) ===')
console.log(JSON.stringify(review, null, 2))
