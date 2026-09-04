import type { FastifyInstance } from 'fastify'
import { pgPool } from '../../../db/postgres.js'
import { PatientAccessService } from '../../../application/patient-access/patient-access.service.js'
import { PatientAccessInviteService } from '../../../application/patient-access/patient-access-invite.service.js'
import { PatientAccessGrantPgRepository } from '../../persistence/patient-access-grant.pg.repository.js'
import { CareCircleService } from '../../../application/care-circle/care-circle.service.js'
import { CareCirclePgRepository } from '../../persistence/care-circle.pg.repository.js'
import { PatientAccessInvitePgRepository } from '../../persistence/patient-access-invite.pg.repository.js'
import { PatientMembershipPgRepository } from '../../persistence/app-account.pg.repository.js'
import { ProductEventPgRepository } from '../../persistence/product-event.pg.repository.js'
import { ProductEventService } from '../../../application/telemetry/product-event.service.js'
import { PatientAccessAuditService } from '../../../application/patient-access/patient-access-audit.service.js'
import { getAuthService } from '../auth/auth.routes.js'
import { createAuthHook } from '../auth/auth.middleware.js'
import { PatientAccessController } from './patient-access.controller.js'
import { PatientAccessInviteController } from './patient-access-invite.controller.js'

export async function patientAccessRoutes(app: FastifyInstance) {
  const authService = getAuthService()
  if (!authService) {
    app.log.warn('Rotas patient-access desativadas — auth não configurado')
    return
  }

  const memberships = new PatientMembershipPgRepository(pgPool)
  const requireAuth = createAuthHook(authService, true, memberships)
  const grants = new PatientAccessGrantPgRepository(pgPool)
  const invites = new PatientAccessInvitePgRepository(pgPool)
  const productEvents = new ProductEventService(new ProductEventPgRepository(pgPool))
  const auditService = new PatientAccessAuditService(pgPool, productEvents)
  const accessService = new PatientAccessService(grants, memberships, pgPool, auditService)
  const circleService = new CareCircleService(new CareCirclePgRepository(pgPool), pgPool)
  const webBaseUrl = process.env.WEB_PUBLIC_URL ?? process.env.VITE_WEB_URL ?? 'http://localhost:5173'
  const inviteService = new PatientAccessInviteService(
    invites,
    grants,
    accessService,
    circleService,
    pgPool,
    webBaseUrl,
    auditService,
  )

  const grantController = new PatientAccessController(accessService)
  const inviteController = new PatientAccessInviteController(inviteService, pgPool)

  app.get('/family-access/invites/preview/:token', inviteController.preview.bind(inviteController))

  app.register(async (scoped) => {
    scoped.addHook('onRequest', requireAuth)

    scoped.get('/family-access/invites', inviteController.list.bind(inviteController))
    scoped.get('/family-access/owned-patients', inviteController.listOwnedPatients.bind(inviteController))
    scoped.post('/family-access/invites', inviteController.create.bind(inviteController))
    scoped.delete('/family-access/invites/:id', inviteController.revoke.bind(inviteController))
    scoped.post('/family-access/invites/accept', inviteController.accept.bind(inviteController))

    scoped.get('/patients/:id/access-grants', grantController.list.bind(grantController))
    scoped.get('/patients/:id/access-audit', grantController.listAudit.bind(grantController))
    scoped.post('/patients/:id/access-grants', grantController.create.bind(grantController))
    scoped.delete('/patients/:id/access-grants/:grantId', grantController.revoke.bind(grantController))
  })
}
