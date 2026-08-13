import type { Pool } from 'pg'
import type { DocumentService } from './document.service.js'
import type { HandwritingCreditsService } from '../handwriting/handwriting-credits.service.js'
import type { FileStorage } from '../../domain/document/file-storage.js'
import type { PrescriptionUnderstandingPort } from '../../domain/document/handwriting-understanding.js'
import type { VaccineCardUnderstandingPort } from '../../domain/document/vaccine-understanding.js'
import { isHandwritingDocumentType } from '../../domain/document/handwriting-types.js'
import { isHandwritingInterpretationEnabled, tierForCreditSource, estimatedInterpretationCostCents } from '../../domain/document/handwriting-policy.js'
import { NotFoundError } from '../../domain/errors.js'

export class DocumentInterpretationService {
  constructor(
    private readonly pool: Pool,
    private readonly documents: DocumentService,
    private readonly credits: HandwritingCreditsService,
    private readonly storage: FileStorage,
    private readonly understanding: PrescriptionUnderstandingPort,
    private readonly vaccineUnderstanding?: VaccineCardUnderstandingPort,
  ) {}

  async interpretHandwritingDocument(documentId: string, scopeId: string) {
    if (!isHandwritingInterpretationEnabled()) {
      throw new Error('Interpretação de manuscrito desabilitada (GEMINI_API_KEY / HANDWRITING_INTERPRETATION_ENABLED)')
    }

    const doc = await this.documents.findById(documentId)
    if (!isHandwritingDocumentType(doc.documentType)) {
      throw new Error('Interpretação LLM disponível apenas para receitas, exames e laudos manuscritos')
    }
    if (!doc.mimeType) throw new Error('Documento sem mime type')

    const { source, quota } = await this.credits.consumeInterpretationCredit(scopeId, documentId)
    const tier = tierForCreditSource(source)
    try {
      const stored = await this.storage.read(doc.storagePath)
      const interpretation = await this.understanding.interpretHandwriting(
        stored.buffer,
        stored.contentType ?? doc.mimeType,
        { tier, ocrText: doc.extractedText },
      )

      await this.pool.query(
        `UPDATE documents
         SET interpretation_json = $2::jsonb,
             interpreted_at = NOW(),
             interpretation_provider = $3,
             extracted_text = COALESCE(NULLIF(extracted_text, ''), $4)
         WHERE id = $1`,
        [
          documentId,
          JSON.stringify(interpretation),
          interpretation.provider,
          interpretation.rawTranscription || doc.extractedText || null,
        ],
      )

      await this.enrichInterpretUsageMetadata(scopeId, documentId, {
        provider: interpretation.provider,
        tier,
        estimatedCostCents: estimatedInterpretationCostCents(tier, interpretation.provider),
        creditSource: source,
      })

      return { interpretation, quota, creditSource: source, tier }
    } catch (err) {
      await this.credits.grantPackage(scopeId, 1, {
        refund: true,
        reason: err instanceof Error ? err.message : String(err),
        documentId,
      })
      throw err
    }
  }

  async interpretVaccineCardDocument(documentId: string, scopeId: string) {
    if (!isHandwritingInterpretationEnabled()) {
      throw new Error('Interpretação desabilitada (GEMINI_API_KEY / HANDWRITING_INTERPRETATION_ENABLED)')
    }
    if (!this.vaccineUnderstanding) {
      throw new Error('Interpretação de carteira de vacina não configurada')
    }

    const doc = await this.documents.findById(documentId)
    if (doc.documentType !== 'vaccine_card') {
      throw new Error('Interpretação LLM de carteira disponível apenas para documentos tipo vaccine_card')
    }
    if (!doc.mimeType) throw new Error('Documento sem mime type')

    const { source, quota } = await this.credits.consumeInterpretationCredit(scopeId, documentId)
    const tier = tierForCreditSource(source)
    try {
      const stored = await this.storage.read(doc.storagePath)
      const interpretation = await this.vaccineUnderstanding.interpretVaccineCard(
        stored.buffer,
        stored.contentType ?? doc.mimeType,
        { tier, ocrText: doc.extractedText },
      )

      await this.pool.query(
        `UPDATE documents
         SET interpretation_json = $2::jsonb,
             interpreted_at = NOW(),
             interpretation_provider = $3,
             extracted_text = COALESCE(NULLIF(extracted_text, ''), $4)
         WHERE id = $1`,
        [
          documentId,
          JSON.stringify({ ...interpretation, interpretationKind: 'vaccine_card' }),
          interpretation.provider,
          interpretation.rawTranscription || doc.extractedText || null,
        ],
      )

      await this.enrichInterpretUsageMetadata(scopeId, documentId, {
        provider: interpretation.provider,
        tier,
        estimatedCostCents: estimatedInterpretationCostCents(tier, interpretation.provider),
        creditSource: source,
      })

      return { interpretation, quota, creditSource: source, tier }
    } catch (err) {
      await this.credits.grantPackage(scopeId, 1, {
        refund: true,
        reason: err instanceof Error ? err.message : String(err),
        documentId,
      })
      throw err
    }
  }

  private async enrichInterpretUsageMetadata(
    scopeId: string,
    documentId: string,
    meta: Record<string, unknown>,
  ) {
    await this.pool.query(
      `UPDATE handwriting_credit_events
       SET metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
       WHERE id = (
         SELECT id FROM handwriting_credit_events
         WHERE scope_id = $1 AND document_id = $2 AND event_type = 'interpret'
         ORDER BY created_at DESC LIMIT 1
       )`,
      [scopeId, documentId, JSON.stringify(meta)],
    )
  }

  async getInterpretation(documentId: string) {
    const doc = await this.documents.findById(documentId)
    const { rows } = await this.pool.query(
      `SELECT interpretation_json, interpreted_at, interpretation_provider
       FROM documents WHERE id = $1`,
      [documentId],
    )
    if (!rows.length) throw new NotFoundError('Document', documentId)
    return {
      documentId,
      documentType: doc.documentType,
      interpretation: rows[0].interpretation_json ?? null,
      interpretedAt: rows[0].interpreted_at ?? null,
      interpretationProvider: rows[0].interpretation_provider ?? null,
    }
  }
}
