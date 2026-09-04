import type { FastifyInstance } from 'fastify'
import { pgPool } from '../../../db/postgres.js'
import { getAuthService } from '../auth/auth.routes.js'
import { createAuthHook } from '../auth/auth.middleware.js'
import { PatientMembershipPgRepository } from '../../persistence/app-account.pg.repository.js'
import { ProductEventService } from '../../../application/telemetry/product-event.service.js'
import { ProductEventPgRepository } from '../../persistence/product-event.pg.repository.js'
import { SupportReportService } from '../../../application/support-report/support-report.service.js'
import { SupportReportPgRepository } from '../../persistence/support-report.pg.repository.js'
import { SupportReportController } from './support-report.controller.js'

export async function supportReportRoutes(app: FastifyInstance) {
  const authService = getAuthService()
  if (!authService) {
    app.log.warn('Rotas /support/reports desativadas — auth não configurado')
    return
  }

  const memberships = new PatientMembershipPgRepository(pgPool)
  const requireAuth = createAuthHook(authService, true, memberships)
  const productEvents = new ProductEventService(new ProductEventPgRepository(pgPool))
  const service = new SupportReportService(new SupportReportPgRepository(pgPool), productEvents)
  const controller = new SupportReportController(service)

  app.addHook('onRequest', requireAuth)

  app.post('/support/reports', controller.create.bind(controller))
  app.get('/support/reports', controller.list.bind(controller))
  app.get('/support/reports/:id', controller.getById.bind(controller))
}
