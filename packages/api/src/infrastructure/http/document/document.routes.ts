import type { FastifyInstance } from 'fastify'
import multipart from '@fastify/multipart'
import { DocumentController } from './document.controller.js'
import { DocumentService } from '../../../application/document/document.service.js'
import { DocumentInterpretationService } from '../../../application/document/document-interpretation.service.js'
import { HandwritingCreditsService } from '../../../application/handwriting/handwriting-credits.service.js'
import { isLocalOcrSufficient } from '../../../application/document/ocr-quality.js'
import { DocumentPgRepository } from '../../persistence/document.pg.repository.js'
import { PatientPgRepository } from '../../persistence/patient.pg.repository.js'
import { GcsFileStorage } from '../../storage/gcs.storage.js'
import { CascadeOcrProvider } from '../../ocr/cascade-ocr.provider.js'
import { buildDocumentOcrProviders } from '../../ocr/document-ocr.factory.js'
import { pgPool } from '../../../db/postgres.js'
import { HandwritingCreditsPgRepository } from '../../persistence/handwriting-credits.pg.repository.js'
import { LlmUsagePgRepository } from '../../persistence/llm-usage.pg.repository.js'
import { LlmQuotaService } from '../../../application/llm/llm-quota.service.js'
import { CascadePrescriptionUnderstandingProvider } from '../../llm/cascade-prescription-understanding.provider.js'
import { GeminiVaccineCardUnderstandingProvider } from '../../llm/gemini-vaccine.provider.js'
import type { DocumentType } from '../../../domain/document/document.entity.js'

export async function documentRoutes(app: FastifyInstance) {
  await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } })

  // Product path: local algorithms first (Tesseract / TrOCR); Google Vision only if insufficient. No LLM.
  const ocrFactory = (documentType: DocumentType) =>
    new CascadeOcrProvider(
      buildDocumentOcrProviders(documentType),
      (text) => isLocalOcrSufficient(documentType, text),
    )

  const service = new DocumentService(
    new DocumentPgRepository(pgPool),
    new GcsFileStorage(),
    new PatientPgRepository(pgPool),
    ocrFactory,
  )
  const creditsRepo = new HandwritingCreditsPgRepository(pgPool)
  const handwritingCredits = new HandwritingCreditsService(creditsRepo)
  const llmQuota = new LlmQuotaService(new LlmUsagePgRepository(pgPool), creditsRepo, handwritingCredits)
  const interpretation = new DocumentInterpretationService(
    pgPool,
    service,
    handwritingCredits,
    new GcsFileStorage(),
    new CascadePrescriptionUnderstandingProvider(),
    new GeminiVaccineCardUnderstandingProvider(),
    llmQuota,
  )
  const controller = new DocumentController(service, interpretation)
  app.post('/documents', controller.create.bind(controller))
  app.post('/documents/upload', controller.upload.bind(controller))
  app.post('/documents/:id/apply-identity', controller.applyIdentity.bind(controller))
  app.get('/documents/ocr-stats', controller.ocrStats.bind(controller))
  app.get('/documents', controller.findAll.bind(controller))
  app.get('/documents/:id', controller.findById.bind(controller))
  app.post('/documents/:id/interpret-handwriting', controller.interpretHandwriting.bind(controller))
  app.post('/documents/:id/interpret-vaccine-card', controller.interpretVaccineCard.bind(controller))
  app.get('/documents/:id/interpretation', controller.getInterpretation.bind(controller))
  app.get('/documents/:id/download', controller.download.bind(controller))
  app.patch('/documents/:id', controller.update.bind(controller))
  app.delete('/documents/:id', controller.delete.bind(controller))
}
