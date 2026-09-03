import type { FastifyInstance } from 'fastify'
import { pgPool } from '../../../db/postgres.js'
import { getAuthService } from '../auth/auth.routes.js'
import { createAuthHook } from '../auth/auth.middleware.js'
import { PatientMembershipPgRepository } from '../../persistence/app-account.pg.repository.js'
import { getUserEscalationService } from '../../../application/user-escalation/user-escalation.factory.js'
import { UserEscalationController } from './user-escalation.controller.js'

export async function userEscalationRoutes(app: FastifyInstance) {
  const authService = getAuthService()
  if (!authService) {
    app.log.warn('Rotas /account/notifications desativadas — auth não configurado')
    return
  }

  const memberships = new PatientMembershipPgRepository(pgPool)
  const requireAuth = createAuthHook(authService, true, memberships)
  const service = getUserEscalationService(pgPool)
  const controller = new UserEscalationController(service)

  app.addHook('onRequest', requireAuth)

  app.get('/account/notification-preferences', controller.getPreferences.bind(controller))
  app.patch('/account/notification-preferences', controller.updatePreferences.bind(controller))
  app.get('/account/sync-escalations', controller.listOpenIncidents.bind(controller))
}

export { getUserEscalationService }
