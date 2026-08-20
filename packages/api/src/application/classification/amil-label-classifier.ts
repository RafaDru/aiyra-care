/** Motor de classificação de rótulos de assistência Amil.
 *  Camada application: combina catálogo canônico + regras por categoria +
 *  fuzzy (via port de infra) + hook opcional de fallback LLM.
 *  Puro (sem I/O) → reutilizável em integração e em jobs.
 */
import {
  TELEMEDICINA_KEYWORDS,
  PRONTO_SOCORRO_KEYWORDS,
  RETORNO_KEYWORDS,
  CONSULTA_KEYWORDS,
  EXAM_KEYWORDS,
  PROCEDIMENTO_KEYWORDS,
  type ExamCatalogLookup,
} from '../../domain/classification/exam-catalog.js'
import {
  normalizeHealthLabel,
  type ClinicalEntityKind,
  type LabelClassification,
  type LabelClassifierEngine,
} from '../../domain/classification/label-classification.js'

/** Threshold de fuzzy mínimo para admitir correspondência de procedimento. */
const FUZZY_THRESHOLD = 0.82

export interface AmilLabelClassifierOptions {
  /** Lookup de catálogo (port). Necessário para mapear procedimentos. */
  lookup?: ExamCatalogLookup
  /** Hook opcional de fallback LLM (ex.: integrar llm-router). Retorna null p/ não usar. */
  llmFallback?: (rawLabel: string, norm: string) => Promise<LabelClassification | null>
  /** Prefixo do procedimento quando detectado via keyword. */
  kindHints?: Partial<Record<ClinicalEntityKind, string[]>>
}

export class AmilLabelClassifier implements LabelClassifierEngine {
  readonly id = 'amil-rules-fuzzy'
  private readonly lookup?: ExamCatalogLookup
  private readonly llmFallback?: (rawLabel: string, norm: string) => Promise<LabelClassification | null>
  private readonly examKeywords: string[]
  private readonly consultaKeywords: string[]
  private readonly procedimentoKeywords: string[]

  constructor(opts: AmilLabelClassifierOptions = {}) {
    this.lookup = opts.lookup
    this.llmFallback = opts.llmFallback
    this.examKeywords = opts.kindHints?.exame ?? EXAM_KEYWORDS
    this.consultaKeywords = opts.kindHints?.consulta ?? CONSULTA_KEYWORDS
    this.procedimentoKeywords = opts.kindHints?.procedimento ?? PROCEDIMENTO_KEYWORDS
  }

  async classify(rawLabel: string): Promise<LabelClassification> {
    return this.classifyWithLlm(rawLabel)
  }

  async classifyBatch(rawLabels: string[]): Promise<LabelClassification[]> {
    return rawLabels.map((l) => this.classifySync(l))
  }

  /** Classificação síncrona local (sem fallback LLM). Retorna sempre uma classificação. */
  classifySync(rawLabel: string): LabelClassification {
    const norm = normalizeHealthLabel(rawLabel)
    if (norm) {
      const hit = this.lookup?.byAlias(rawLabel)
      if (hit) {
        return {
          rawLabel,
          normalizedLabel: norm,
          kind: 'exame',
          destination: 'exam',
          canonicalName: hit.entry.name,
          catalogId: hit.entry.id,
          matchedAlias: undefined,
          method: hit.method,
          confidence: 1,
          reason: `Catálogo: ${hit.entry.id}`,
        }
      }
    }

    // Categoria via palavras-chave (sobre o rótulo original e normalizado).
    if (norm) {
      const upperSource = `${rawLabel} ${norm}`.toUpperCase()

      if (TELEMEDICINA_KEYWORDS.some((k) => upperSource.includes(k))) {
        return this.base(rawLabel, norm, 'telemedicina', 'medical_record', 0.9, 'Palavra-chave de telemedicina/telesaúde')
      }
      if (PRONTO_SOCORRO_KEYWORDS.some((k) => upperSource.includes(k))) {
        return this.base(rawLabel, norm, 'pronto-socorro', 'medical_record', 0.9, 'Palavra-chave de pronto-socorro/urgência')
      }
      if (RETORNO_KEYWORDS.some((k) => upperSource.includes(k))) {
        return this.base(rawLabel, norm, 'retorno', 'medical_record', 0.85, 'Palavra-chave de retorno')
      }
      if (this.procedimentoKeywords.some((k) => upperSource.includes(k))) {
        return this.base(rawLabel, norm, 'procedimento', 'medical_record', 0.7, 'Palavra-chave de procedimento')
      }
      if (this.examKeywords.some((k) => upperSource.includes(k))) {
        return this.base(rawLabel, norm, 'exame', 'exam', 0.7, 'Palavra-chave de exame')
      }
      if (this.consultaKeywords.some((k) => upperSource.includes(k))) {
        return this.base(rawLabel, norm, 'consulta', 'medical_record', 0.8, 'Palavra-chave de consulta')
      }
    }

    // Fuzzy no catálogo (reconhece variações).
    if (norm && this.lookup) {
      const fuzzy = this.lookup.bestFuzzy(rawLabel, FUZZY_THRESHOLD)
      if (fuzzy) {
        return {
          rawLabel,
          normalizedLabel: norm,
          kind: 'exame',
          destination: 'exam',
          canonicalName: fuzzy.entry.name,
          catalogId: fuzzy.entry.id,
          method: 'fuzzy',
          confidence: fuzzy.similarity,
          reason: `Fuzzy ${fuzzy.similarity.toFixed(2)} -> ${fuzzy.entry.id}`,
        }
      }
    }

    // Fallback genérico.
    return this.base(rawLabel, norm || rawLabel, 'outro', 'medical_record', 0.2, 'Fallback sem classificação')
  }

  private base(
    rawLabel: string,
    norm: string,
    kind: ClinicalEntityKind,
    destination: LabelClassification['destination'],
    confidence: number,
    reason: string,
  ): LabelClassification {
    return { rawLabel, normalizedLabel: norm, kind, destination, method: 'category', confidence, reason }
  }

  /** Versão assíncrona que permite fallback LLM para rótulos ambíguos.
   *  Usada quando a classificação local não é confiável (confiança baixa).
   */
  async classifyWithLlm(rawLabel: string): Promise<LabelClassification> {
    const local = this.classifySync(rawLabel)
    if (local.confidence >= 0.6 || !this.llmFallback) return local
    const llm = await this.llmFallback(rawLabel, local.normalizedLabel)
    return llm ?? local
  }
}
