/**
 * Fallback LLM para extração de marcadores quando o parser determinístico
 * da fonte não reconhece o formato do laudo.
 *
 * - Custo: bucket INTERNO (nosso), feature 'exam_marker_extraction', teto mensal.
 * - Aprendizado: cada marcador descoberto via LLM é registrado no catálogo
 *   semântico (domain='lab_analyte') para futuras consultas determinísticas.
 */

import type { Pool } from 'pg'
import { LlmRouter } from '../../infrastructure/llm/llm-router.js'
import { LlmUsagePgRepository } from '../../infrastructure/persistence/llm-usage.pg.repository.js'
import { LlmInternalBudgetPgRepository } from '../../infrastructure/persistence/llm-internal-budget.pg.repository.js'
import { LlmInternalCostService } from '../llm/llm-internal-cost.service.js'
import { SemanticCatalogCachePgRepository } from '../../infrastructure/persistence/semantic-catalog-cache.pg.repository.js'
import {
  buildMarkerExtractionMessages,
  parseMarkersJson,
  estimateMarkerExtractionTokens,
  toExtractedItems,
} from '../../domain/llm/llm-marker-extraction-prompt.js'
import type { ExtractedExamMarkerItem } from '../../domain/exam-artifact/exam-artifact.types.js'
import { normalizeHealthLabel } from '../../domain/classification/label-classification.js'
import { stableOpenCodeSessionFromParts } from '../../domain/llm/opencode-session.js'

export interface LlmMarkerFallbackOptions {
  patientId?: string
  trigger?: string
}

export interface LlmMarkerFallbackOutcome {
  markers: ExtractedExamMarkerItem[]
  parsedMeta: {
    collectedAt?: Date
  }
  skipReason?: 'budget-exhausted' | 'llm-error' | 'empty-response'
}

export class LlmMarkerFallbackExtractor {
  private readonly costService: LlmInternalCostService
  private readonly router: LlmRouter
  private readonly cacheRepo: SemanticCatalogCachePgRepository

  constructor(
    pool: Pool,
    private readonly opts: LlmMarkerFallbackOptions = {},
  ) {
    this.costService = new LlmInternalCostService(
      new LlmUsagePgRepository(pool),
      new LlmInternalBudgetPgRepository(pool),
    )
    this.router = new LlmRouter()
    this.cacheRepo = new SemanticCatalogCachePgRepository(pool)
  }

  async extractMarkers(reportText: string): Promise<LlmMarkerFallbackOutcome> {
    const messages = buildMarkerExtractionMessages(reportText)
    const usage = estimateMarkerExtractionTokens(messages)

    // Teto interno — se esgotado, nem chama a LLM
    const canSpend = await this.costService.canSpend('llm', 'probe', usage)
    if (!canSpend) {
      await this.costService.recordBudgetExhausted({
        feature: 'exam_marker_extraction',
        trigger: this.opts.trigger,
      })
      return { markers: [], parsedMeta: {}, skipReason: 'budget-exhausted' }
    }

    try {
      const markerSessionId = `exam-marker:${this.opts.patientId ?? 'unknown'}:${stableOpenCodeSessionFromParts([reportText])}`
      const completion = await this.router.completeJson(messages, 'premium', {
        allowLlmDataSharing: defaultAllowZenFree(),
        opencodeSessionId: markerSessionId,
      })

      await this.costService.recordCall({
        provider: completion.provider,
        model: completion.model,
        tier: completion.tier,
        usage: completion.usage,
        patientId: this.opts.patientId,
        feature: 'exam_marker_extraction',
        metadata: { purpose: 'exam_marker_extraction', trigger: this.opts.trigger },
      })

      const parsed = parseMarkersJson(completion.text)
      if (parsed.length === 0) {
        return { markers: [], parsedMeta: {}, skipReason: 'empty-response' }
      }

      // Coleta (aproximada) do laudo para os itens extraídos
      const collectedAt = this.guessCollectedAt(reportText) ?? new Date()
      const items = toExtractedItems(parsed, collectedAt)

      // ── Aprendizado: registra no catálogo semântico (fire-and-forget) ──
      for (const item of items) {
        const norm = normalizeHealthLabel(item.markerName)
        if (!norm) continue
        this.cacheRepo
          .saveOrIncrement({
            domain: 'lab_analyte',
            rawLabel: item.markerName,
            normalizedLabel: norm,
            kind: 'lab_marker',
            destination: 'exam_result_item',
            canonicalName: item.technicalName ?? item.markerName,
            confidence: 0.9,
            sourceMethod: 'llm',
          })
          .catch(() => {})
      }

      return { markers: items, parsedMeta: { collectedAt } }
    } catch {
      await this.costService.recordLocalFallback({
        feature: 'exam_marker_extraction',
        trigger: this.opts.trigger,
      })
      return { markers: [], parsedMeta: {}, skipReason: 'llm-error' }
    }
  }

  /** "Coleta:\n31/10/2022 - 11:18:44" → Date */
  private guessCollectedAt(text: string): Date | null {
    const m = text.match(/Coleta:?\s*\n?(\d{2}\/\d{2}\/\d{4}(?:\s*-\s*\d{2}:\d{2}(?::\d{2})?)?)/)
    if (!m) return null
    const p = m[1].match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s*-\s*(\d{2}):(\d{2}))?/)
    if (!p) return null
    return new Date(
      Number(p[3]),
      Number(p[2]) - 1,
      Number(p[1]),
      p[4] ? Number(p[4]) : 12,
      p[5] ? Number(p[5]) : 0,
    )
  }
}

function defaultAllowZenFree(): boolean {
  const v = process.env.LLM_INTERNAL_ALLOW_ZEN_FREE?.trim().toLowerCase()
  return !(v === '0' || v === 'false' || v === 'no' || v === 'off')
}
