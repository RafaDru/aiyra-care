import type { FastifyInstance } from 'fastify'
import { pgPool } from '../../../db/postgres.js'
import { LegalComplianceService } from '../../../application/legal-compliance/legal-compliance.service.js'
import { createLegalContentPort } from '../../legal-compliance/legal-content.factory.js'
import {
  LegalAcceptancePgRepository,
  LegalDocumentPgRepository,
} from '../../persistence/legal-compliance.pg.repository.js'
import { LegalComplianceController } from './legal-compliance.controller.js'

export async function legalComplianceRoutes(app: FastifyInstance) {
  const content = createLegalContentPort()
  const service = new LegalComplianceService(
    new LegalDocumentPgRepository(pgPool),
    new LegalAcceptancePgRepository(pgPool),
    content,
  )
  const controller = new LegalComplianceController(service)

  app.get('/compliance/documents', controller.listDocuments.bind(controller))
  app.get('/compliance/documents/:kind/current', controller.getCurrent.bind(controller))
  app.get('/compliance/contact', controller.contact.bind(controller))
  app.get('/compliance/go-live-status', controller.goLiveStatus.bind(controller))
  app.get('/compliance/status', controller.status.bind(controller))
  app.post('/compliance/accept', controller.accept.bind(controller))
}

export function getLegalComplianceService(): LegalComplianceService {
  const content = createLegalContentPort()
  return new LegalComplianceService(
    new LegalDocumentPgRepository(pgPool),
    new LegalAcceptancePgRepository(pgPool),
    content,
  )
}
