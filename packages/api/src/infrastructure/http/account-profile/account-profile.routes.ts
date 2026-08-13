import type { FastifyInstance } from 'fastify'
import { pgPool } from '../../../db/postgres.js'
import { AccountProfileService } from '../../../application/account-profile/account-profile.service.js'
import { AppAccountPgRepository, PatientMembershipPgRepository } from '../../persistence/app-account.pg.repository.js'
import { AccountProfilePgRepository } from '../../persistence/account-profile.pg.repository.js'
import { AccountProfileController } from './account-profile.controller.js'
import { getAuthService } from '../auth/auth.routes.js'
import { createAuthHook } from '../auth/auth.middleware.js'

export async function accountProfileRoutes(app: FastifyInstance) {
  const authService = getAuthService()
  if (!authService) {
    app.log.warn('Rotas /auth/profile desativadas — auth não configurado')
    return
  }

  const memberships = new PatientMembershipPgRepository(pgPool)
  const requireAuth = createAuthHook(authService, true, memberships)

  const service = new AccountProfileService(
    new AppAccountPgRepository(pgPool),
    new AccountProfilePgRepository(pgPool),
  )
  const controller = new AccountProfileController(service)

  app.addHook('onRequest', requireAuth)

  app.get('/auth/profile', controller.get.bind(controller))
  app.patch('/auth/profile', controller.update.bind(controller))
}
