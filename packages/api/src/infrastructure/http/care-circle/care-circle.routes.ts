import type { FastifyInstance } from 'fastify'
import { pgPool } from '../../../db/postgres.js'
import { CareCircleService } from '../../../application/care-circle/care-circle.service.js'
import { CareCirclePgRepository } from '../../persistence/care-circle.pg.repository.js'
import { PatientMembershipPgRepository } from '../../persistence/app-account.pg.repository.js'
import { getAuthService } from '../auth/auth.routes.js'
import { createAuthHook } from '../auth/auth.middleware.js'
import { CareCircleController } from './care-circle.controller.js'

export async function careCircleRoutes(app: FastifyInstance) {
  const authService = getAuthService()
  if (!authService) {
    app.log.warn('Rotas /care-circles desativadas — auth não configurado')
    return
  }

  const memberships = new PatientMembershipPgRepository(pgPool)
  const requireAuth = createAuthHook(authService, true, memberships)
  const service = new CareCircleService(new CareCirclePgRepository(pgPool), pgPool)
  const controller = new CareCircleController(service)

  app.addHook('onRequest', requireAuth)

  app.get('/care-circles', controller.list.bind(controller))
  app.get('/care-circles/dashboard', controller.dashboard.bind(controller))
  app.post('/care-circles', controller.create.bind(controller))
  app.get('/care-circles/:id', controller.get.bind(controller))
  app.patch('/care-circles/:id', controller.update.bind(controller))
  app.get('/care-circles/:id/members', controller.listMembers.bind(controller))
  app.post('/care-circles/:id/members', controller.addMember.bind(controller))
  app.delete('/care-circles/:id/members/:memberId', controller.removeMember.bind(controller))
  app.get('/care-circles/:id/linkable-patients', controller.listLinkablePatients.bind(controller))
  app.post('/care-circles/:id/patients', controller.linkPatient.bind(controller))
  app.delete('/care-circles/:id/patients/:patientId', controller.unlinkPatient.bind(controller))
}
