import type { FastifyInstance } from 'fastify'
import { pgPool } from '../../../db/postgres.js'
import { getAuthService } from '../auth/auth.routes.js'
import { createAuthHook } from '../auth/auth.middleware.js'
import { PatientMembershipPgRepository } from '../../persistence/app-account.pg.repository.js'
import { GovBrSessionController } from './govbr-session.controller.js'

export async function govBrSessionRoutes(app: FastifyInstance) {
  const authService = getAuthService()
  if (!authService) {
    app.log.warn('Rotas /account/govbr-session desativadas — auth não configurado')
    return
  }

  const memberships = new PatientMembershipPgRepository(pgPool)
  const requireAuth = createAuthHook(authService, true, memberships)
  const controller = new GovBrSessionController(pgPool)

  app.addHook('onRequest', requireAuth)
  app.get('/account/govbr-session', controller.getSession.bind(controller))
}
