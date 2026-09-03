import type { FastifyReply } from 'fastify'
import type { UserEscalationService } from '../../../application/user-escalation/user-escalation.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { updateNotificationPreferencesSchema } from './user-escalation.schema.js'

export class UserEscalationController {
  constructor(private readonly service: UserEscalationService) {}

  async getPreferences(request: AuthenticatedRequest, reply: FastifyReply) {
    if (!request.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const prefs = await this.service.getPreferences(request.accountId)
    return reply.send({
      syncEscalationEmail: prefs.syncEscalationEmail,
      syncEscalationOptedInAt: prefs.syncEscalationOptedInAt?.toISOString() ?? null,
      updatedAt: prefs.updatedAt.toISOString(),
    })
  }

  async updatePreferences(request: AuthenticatedRequest, reply: FastifyReply) {
    if (!request.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const parsed = updateNotificationPreferencesSchema.safeParse(request.body ?? {})
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const prefs = await this.service.updatePreferences(
      request.accountId,
      parsed.data.syncEscalationEmail,
    )
    return reply.send({
      syncEscalationEmail: prefs.syncEscalationEmail,
      syncEscalationOptedInAt: prefs.syncEscalationOptedInAt?.toISOString() ?? null,
      updatedAt: prefs.updatedAt.toISOString(),
    })
  }

  async listOpenIncidents(request: AuthenticatedRequest, reply: FastifyReply) {
    if (!request.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const incidents = await this.service.listOpenIncidents(request.accountId)
    return reply.send({
      incidents: incidents.map((i) => ({
        id: i.id,
        integrationLinkId: i.integrationLinkId,
        portalType: i.portalType,
        status: i.status,
        failureCount: i.failureCount,
        openedAt: i.openedAt.toISOString(),
        lastNotifiedAt: i.lastNotifiedAt?.toISOString() ?? null,
      })),
    })
  }
}
