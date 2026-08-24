/**
 * Pipeline unificado de extração de artefatos de exame (laudos).
 *
 * Sequência motora única para TODAS as origens (hospital, plano, laboratório):
 *   1. Texto: extração nativa (Python/PyMuPDF) → se vazio, OCR (cascade)
 *   2. Parser determinístico da fonte (Mater Dei, Hermes Pardini, …)
 *   3. Fallback LLM interno (metered, teto R$100/mês) quando o parser não reconhece
 *      o formato — e a descoberta é registrada no catálogo semântico (aprendizado).
 */

import type { Pool } from 'pg'
import { extractReportPdfText } from '../scraper/exam-pdf-text.helper.js'
import { MaterDeiPdfReportParser } from '../ocr/materdei-pdf.parser.js'
import { HermesPardiniPdfReportParser } from '../ocr/hermes-pardini-pdf.parser.js'
import type {
  ExamArtifactExtractionOutcome,
  ExamReportParser,
  ExtractedExamMarkerItem,
} from '../../domain/exam-artifact/exam-artifact.types.js'
import { LlmMarkerFallbackExtractor } from '../../application/exam-artifact/llm-marker-fallback.extractor.js'

/** Adapter: parser Hermes Pardini legado → porta ExamReportParser. */
class HermesPardiniParserAdapter implements ExamReportParser {
  readonly sourceId = 'hermes-pardini'
  private readonly inner = new HermesPardiniPdfReportParser()

  canHandle(hint: string): boolean {
    return /hermes|pardini/i.test(hint)
  }

  parse(fullText: string) {
    const r = this.inner.parse(fullText)
    const markers: ExtractedExamMarkerItem[] = r.markers.map(({ isHistorical: _ih, ...rest }) => rest)
    return { ...r, markers }
  }
}

/** Registra parsers por fornecedor aqui (ordem = prioridade de tentativa). */
function buildSourceParsers(): ExamReportParser[] {
  return [new MaterDeiPdfReportParser(), new HermesPardiniParserAdapter()]
}

export interface ExtractExamArtifactOptions {
  patientId?: string
  /** Habilita fallback LLM (default: env, mesmo gate da classificação). */
  allowLlm?: boolean
  trigger?: string
}

export interface ExtractExamArtifactInput {
  buffer: Buffer
  mimeType: string
  /** Filename ou hint de origem p/ escolher o parser. */
  sourceHint: string
}

/**
 * Etapas 1+2+3 do pipeline. Não persiste nada — retorna o resultado canônico
 * para o chamador decidir (persistência fica no service/script).
 */
export async function extractExamArtifact(
  input: ExtractExamArtifactInput,
  pool: Pool,
  opts: ExtractExamArtifactOptions = {},
): Promise<ExamArtifactExtractionOutcome> {
  // ── Etapa 1: texto (nativo → OCR) ──
  const rawText = await extractReportPdfText(input.buffer, input.mimeType)
  const text = rawText?.replace(/\0/g, '').trim() ?? ''
  if (text.length < 10) {
    return {
      method: 'none',
      llmConsulted: false,
      markers: [],
      skipReason: 'empty-text',
    }
  }

  // ── Etapa 2: parser determinístico da fonte ──
  const parsers = buildSourceParsers()
  const matched =
    parsers.find((p) => p.canHandle(input.sourceHint)) ??
    // Sem hint reconhecível: tenta todos e usa o que produzir mais marcadores
    null

  if (matched) {
    const parsed = matched.parse(text)
    if (parsed.markers.length > 0) {
      return { ...parsed, method: 'source-parser', llmConsulted: false }
    }
  }

  // ── Etapa 3: fallback LLM interno (metered) ──
  const allowLlm = opts.allowLlm ?? defaultAllowMarkerLlm()
  if (!allowLlm) {
    return {
      method: 'none',
      llmConsulted: false,
      markers: [],
      collectedAt: matched?.parse(text).collectedAt,
      skipReason: 'no-markers',
    }
  }

  const extractor = new LlmMarkerFallbackExtractor(pool, {
    patientId: opts.patientId,
    trigger: opts.trigger ?? 'artifact-pipeline',
  })
  const llmOutcome = await extractor.extractMarkers(text)
  if (llmOutcome.markers.length > 0) {
    return {
      ...llmOutcome.parsedMeta,
      markers: llmOutcome.markers,
      method: 'llm-fallback',
      llmConsulted: true,
    }
  }

  return {
    method: 'none',
    llmConsulted: true,
    markers: [],
    collectedAt: matched?.parse(text).collectedAt,
    skipReason: llmOutcome.skipReason ?? 'llm-error',
  }
}

function defaultAllowMarkerLlm(): boolean {
  const v = process.env.LLM_INTERNAL_EXAM_MARKERS_LLM?.trim().toLowerCase()
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false
  if (v === '1' || v === 'true' || v === 'on' || v === 'yes') return true
  // Default: segue o mesmo gate da classificação interna
  return !!process.env.OPENCODE_GO_API_KEY || !!process.env.GEMINI_API_KEY
}
