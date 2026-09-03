import type { FastifyInstance } from 'fastify'
import { pgPool } from '../../../db/postgres.js'
import { OrganizationService } from '../../../application/organization/organization.service.js'
import { OrganizationPgRepository } from '../../persistence/organization.pg.repository.js'
import { getAuthService } from '../auth/auth.routes.js'
import { createAuthHook } from '../auth/auth.middleware.js'
import { PatientMembershipPgRepository } from '../../persistence/app-account.pg.repository.js'
import { OrganizationController } from './organization.controller.js'

export async function organizationRoutes(app: FastifyInstance) {
  const authService = getAuthService()
  if (!authService) {
    app.log.warn('Rotas /organizations desativadas — auth não configurado')
    return
  }

  const memberships = new PatientMembershipPgRepository(pgPool)
  const requireAuth = createAuthHook(authService, true, memberships)
  const controller = new OrganizationController(new OrganizationService(new OrganizationPgRepository(pgPool)))

  app.addHook('onRequest', requireAuth)

  app.get('/organizations', controller.list.bind(controller))
  app.post('/organizations', controller.create.bind(controller))
  app.get('/organizations/:id', controller.get.bind(controller))
  app.patch('/organizations/:id', controller.update.bind(controller))
  app.delete('/organizations/:id', controller.remove.bind(controller))
  app.get('/organizations/:id/members', controller.listMembers.bind(controller))
  app.post('/organizations/:id/members', controller.addMember.bind(controller))
  app.patch('/organizations/:id/members/:memberId', controller.updateMember.bind(controller))
  app.delete('/organizations/:id/members/:memberId', controller.removeMember.bind(controller))
}
