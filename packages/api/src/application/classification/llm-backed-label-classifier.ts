import type { LlmRouter } from '../../infrastructure/llm/llm-router.js'
import type { LlmTier, LlmMessage, LlmTokenUsage } from '../../domain/llm/llm.types.js'
import type { LabelClassifierEngine, LabelClassification, LabelClassificationMethod } from '../../domain/classification/label-classification.js'
import type { LlmInternalCostService } from '../llm/llm-internal-cost.service.js'
import { estimateTokenUsage } from '../../domain/llm/llm-internal-prompt.js'
import { buildClassificationMessages, parseClassificationJson } from '../../domain/llm/llm-internal-prompt.js'
import type { SemanticCacheRepositoryPort } from '../../domain/semantic-classification/semantic-classification.types.js'
import { normalizeHealthLabel } from '../../domain/classification/label-classification.js'

export interface LlmBackedLabelClassifierOptions {
  /** Motor local determinístico (regras + fuzzy) — sempre como base. Deve ter classifySync. */
  local: LabelClassifierEngine & { classifySync(label: string): LabelClassification }
  costService: LlmInternalCostService
  router: LlmRouter
  /** Liga o fallback LLM. Mesmo ligado, o teto interno pode bloquear por chamada. */
  allowLlm?: boolean
  /** Permite usar Zen free (DeepSeek Free) — pode reter dados para melhorar modelo. Default segue env. */
  allowZenFree?: boolean
  patientId?: string
  /** Confiança mínima local abaixo da qual o LLM pode ser consultado. */
  minConfidence?: number
  tier?: LlmTier
  metadata?: Record<string, unknown>
  cacheRepo?: SemanticCacheRepositoryPort
}

/**
 * Classificador de rótulos de operadora com fallback LLM (custo INTERNO nosso).
 * Regras/fuzzy local primeiro; se confiança baixa e orçamento interno disponível,
 * consulta o LlmRouter (Zen free → Go DeepSeek → Gemini) e metrida o custo.
 * Se o teto interno estiver esgotado, cai de volta no determinístico.
 */
export class LlmBackedLabelClassifier implements LabelClassifierEngine {
  readonly id = 'amil-rules-fuzzy+llm'
  private readonly local: LabelClassifierEngine & { classifySync(label: string): LabelClassification }
  private readonly costService: LlmInternalCostService
  private readonly router: LlmRouter
  private readonly allowLlm: boolean
  private readonly allowZenFree: boolean
  private readonly patientId?: string
  private readonly minConfidence: number
  private readonly tier: LlmTier
  private readonly metadata?: Record<string, unknown>
  private readonly cacheRepo?: SemanticCacheRepositoryPort

  constructor(opts: LlmBackedLabelClassifierOptions) {
    this.local = opts.local
    this.costService = opts.costService
    this.router = opts.router
    this.allowLlm = opts.allowLlm ?? defaultAllowLlm()
    this.allowZenFree = opts.allowZenFree ?? defaultAllowZenFree()
    this.patientId = opts.patientId
    this.minConfidence = opts.minConfidence ?? 0.6
    this.tier = opts.tier ?? 'premium'
    this.metadata = opts.metadata
    this.cacheRepo = opts.cacheRepo
  }

  classifySync(rawLabel: string): LabelClassification {
    return this.local.classifySync(rawLabel)
  }

  async classify(rawLabel: string): Promise<LabelClassification> {
    const local = this.local.classifySync(rawLabel)
    if (!this.allowLlm || local.confidence >= this.minConfidence) {
      return local
    }
    const map = await this.classifyViaLlm([rawLabel])
    const llm = map.get(rawLabel)
    if (llm) return llm
    await this.costService.recordLocalFallback({ label: rawLabel, ...this.metadata })
    return local
  }

  async classifyBatch(rawLabels: string[]): Promise<LabelClassification[]> {
    const localMap = new Map<string, LabelClassification>()
    for (const label of rawLabels) localMap.set(label, this.local.classifySync(label))

    const ambiguous = rawLabels.filter((l) => localMap.get(l)!.confidence < this.minConfidence)
    const llmMap = this.allowLlm && ambiguous.length
      ? await this.classifyViaLlm(ambiguous)
      : new Map<string, LabelClassification>()

    return rawLabels.map((l) => llmMap.get(l) ?? localMap.get(l)!)
  }

  private async classifyViaLlm(
    labels: string[],
  ): Promise<Map<string, LabelClassification>> {
    const result = new Map<string, LabelClassification>()
    const messages: LlmMessage[] = buildClassificationMessages(labels)
    const usage = estimateTokenUsage(messages)

    const canSpend = await this.costService.canSpend('llm', 'probe', usage)
    if (!canSpend) {
      await this.costService.recordBudgetExhausted({
        labels: labels.length,
        ...this.metadata,
      })
      return result
    }

    try {
      const completion = await this.router.completeJson(
        messages,
        this.tier,
        { allowLlmDataSharing: this.allowZenFree },
      )
      await this.costService.recordCall({
        provider: completion.provider,
        model: completion.model,
        tier: completion.tier,
        usage: completion.usage,
        patientId: this.patientId,
        metadata: { purpose: 'label_classification', labels: labels.length, ...this.metadata },
      })
      const parsed = parseClassificationJson(completion.text)
      // Aplica por posição (o LLM deve devolver na mesma ordem) com fallback por label exato.
      for (let i = 0; i < labels.length; i++) {
        const original = labels[i]
        if (result.has(original)) continue
        const p = parsed.find((x) => x.label === original) ?? parsed[i]
        if (!p) continue
        result.set(original, {
          rawLabel: original,
          normalizedLabel: p.normalizedLabel ?? original,
          kind: p.kind,
          destination: p.destination,
          canonicalName: p.canonicalName,
          method: 'llm',
          confidence: 0.9,
          reason: 'classificação via LLM (custo interno)',
        })

        const norm = normalizeHealthLabel(original)
        if (this.cacheRepo && norm) {
          this.cacheRepo.saveOrIncrement({
            domain: 'health_label',
            rawLabel: original,
            normalizedLabel: norm,
            kind: p.kind,
            destination: p.destination,
            canonicalName: p.canonicalName,
            confidence: 0.9,
            sourceMethod: 'llm',
          }).catch(() => {})
        }
      }
      return result
    } catch {
      await this.costService.recordLocalFallback({ label: labels[0], ...this.metadata })
      return result
    }
  }
}

export function defaultAllowLlm(): boolean {
  const v = process.env.LLM_INTERNAL_CLASSIFY_LLM?.trim().toLowerCase()
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false
  return v === '1' || v === 'true' || v === 'on' || v === 'yes' || !!process.env.OPENCODE_GO_API_KEY || !!process.env.GEMINI_API_KEY
}

export function defaultAllowZenFree(): boolean {
  const v = process.env.LLM_INTERNAL_ALLOW_ZEN_FREE?.trim().toLowerCase()
  return !(v === '0' || v === 'false' || v === 'no' || v === 'off')
}

/** Guarda de tipos para `method: 'llm'` (evita importar o type apenas p/ reutilizar acima). */
export type LlmClassificationMethod = Extract<LabelClassificationMethod, 'llm'>

export function toClassificationUsage(usage: LlmTokenUsage): LlmTokenUsage {
  return usage
}
