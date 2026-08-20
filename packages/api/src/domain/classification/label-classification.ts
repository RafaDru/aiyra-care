/** Classificação de rótulos de assistência (operadora) → tipo clínico e destino. */

export type ClinicalEntityKind =
  | 'consulta'
  | 'pronto-socorro'
  | 'telemedicina'
  | 'retorno'
  | 'exame'
  | 'vacina'
  | 'procedimento'
  | 'outro'

export type ClinicalEntityDestination = 'medical_record' | 'exam' | 'vaccine'

export interface LabelClassification {
  /** Identificador original do rótulo (descrição do item). */
  rawLabel: string
  /** Rótulo normalizado/limpo. */
  normalizedLabel: string
  kind: ClinicalEntityKind
  destination: ClinicalEntityDestination
  /** Nome canônico do procedimento/exame, se mapeado. */
  canonicalName?: string
  /** Grupo/procedimento do catálogo, se mapeado. */
  catalogId?: string
  /** Como a decisão foi tomada: exact | synonym | acronym | fuzzy | category | llm | fallback */
  method: LabelClassificationMethod
  /** Confiança 0..1. */
  confidence: number
  /** Motivo legível (ex.: palavra-chave 'URGENCIA' marcou categoria consulta). */
  reason: string
  /** Guarda o rótulo consumido (para debug / reprocessamento). */
  matchedAlias?: string
}

export type LabelClassificationMethod =
  | 'exact'
  | 'synonym'
  | 'acronym'
  | 'fuzzy'
  | 'category'
  | 'llm'
  | 'fallback'

/**
 * Contrato (port) do motor de classificação.
 * Implementações: rules/fuzzy local, fallback LLM, etc.
 * Deve ser puro e sem efeitos colaterais para permitir uso em integração e jobs.
 */
export interface LabelClassifierEngine {
  readonly id: string
  classify(rawLabel: string): Promise<LabelClassification>
  /** Classifica em lote (mais eficiente). */
  classifyBatch?(rawLabels: string[]): Promise<LabelClassification[]>
  /** Classificação síncrona local (sem I/O/LLM). Opcional; usada por mappers/rotas síncronas. */
  classifySync?(rawLabel: string): LabelClassification
}

/** Função auxiliar de normalização exposta pelo domínio (reutilizável). */
export function normalizeHealthLabel(raw: string): string {
  const clean = (raw ?? '').replace(/^\d{5,10}\s*[-–—:]\s*/, '').trim()
  return clean
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
