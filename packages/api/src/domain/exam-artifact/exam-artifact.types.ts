/**
 * Tipos canônicos do pipeline de extração de artefatos de exame (laudos).
 * Sequência motora única para qualquer origem (hospital, plano, laboratório):
 *   1. Extração nativa (Python/pdf) ou OCR quando imagem/escaneado
 *   2. Parser determinístico da fonte (por seção)
 *   3. Fallback LLM interno (metered) + descoberta registrada no catálogo semântico
 */

export interface ExtractedExamMarkerItem {
  markerName: string
  technicalName?: string
  numericValue?: number
  displayValue: string
  unit?: string
  referenceRange?: string
  status: 'normal' | 'altered' | 'critical'
  collectedAt: Date
}

export interface ExamReportParseResult {
  patientName?: string
  doctorName?: string
  orderNumber?: string
  collectedAt?: Date
  markers: ExtractedExamMarkerItem[]
}

/** Porta que todo parser de laudo (por fornecedor) implementa. */
export interface ExamReportParser {
  readonly sourceId: string
  /** Hint rápido (filename/header) — se false, o pipeline tenta os demais. */
  canHandle(hint: string): boolean
  parse(fullText: string): ExamReportParseResult
}

/** Como os marcadores foram obtidos (observabilidade do pipeline). */
export type MarkerExtractionMethod =
  | 'source-parser'
  | 'llm-fallback'
  | 'none'

export type MarkerSkipReason =
  | 'empty-text'
  | 'no-parser'
  | 'no-markers'
  | 'budget-exhausted'
  | 'llm-error'
  | 'empty-response'

export interface ExamArtifactExtractionOutcome extends ExamReportParseResult {
  method: MarkerExtractionMethod
  /** Indica se o LLM foi consultado (mesmo que sem sucesso). */
  llmConsulted: boolean
  /** Motivo quando nenhum marcador foi extraído. */
  skipReason?: MarkerSkipReason
}
