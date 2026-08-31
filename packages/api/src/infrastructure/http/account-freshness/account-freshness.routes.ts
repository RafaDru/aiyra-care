import type { FastifyInstance } from 'fastify'
import { pgPool } from '../../../db/postgres.js'
import { DataGenerationService } from '../../../application/data-generation/data-generation.service.js'
import { DataGenerationPgRepository } from '../../persistence/data-generation.pg.repository.js'
import { PatientMembershipPgRepository } from '../../persistence/app-account.pg.repository.js'
import { AccountFreshnessController } from './account-freshness.controller.js'
import { getAuthService } from '../auth/auth.routes.js'
import { createAuthHook } from '../auth/auth.middleware.js'
import { getRuntimeDegradedService } from '../runtime/runtime-degraded.routes.js'

export function getDataGenerationService(): DataGenerationService {
  return new DataGenerationService(
    new DataGenerationPgRepository(pgPool),
    new PatientMembershipPgRepository(pgPool),
  )
}

export async function accountFreshnessRoutes(app: FastifyInstance) {
  const authService = getAuthService()
  if (!authService) {
    app.log.warn('Rotas /account/freshness desativadas — auth não configurado')
    return
  }

  const memberships = new PatientMembershipPgRepository(pgPool)
  const requireAuth = createAuthHook(authService, true, memberships)
  const controller = new AccountFreshnessController(
    getDataGenerationService(),
    getRuntimeDegradedService(),
  )

  app.addHook('onRequest', requireAuth)
  app.get('/account/freshness', controller.getFreshness.bind(controller))
}
