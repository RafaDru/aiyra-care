import type { FastifyReply } from 'fastify'
import type { MicrosoftCalendarService } from '../../../application/calendar/microsoft-calendar.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess } from '../auth/patient-access.guard.js'
import { z } from 'zod'

const patientIdQuery = z.object({
  patientId: z.string().uuid(),
  returnTo: z.string().max(500).optional(),
})

const syncBodySchema = z.object({ patientId: z.string().uuid() })

export class MicrosoftCalendarController {
  constructor(private readonly service: MicrosoftCalendarService) {}

  async oauthStart(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const parsed = patientIdQuery.safeParse(req.query)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    try {
      const url = this.service.buildAuthUrl(
        req.accountId,
        parsed.data.patientId,
        parsed.data.returnTo,
      )
      return reply.send({ url })
    } catch (err) {
      return reply.status(503).send({
        message: err instanceof Error ? err.message : 'OAuth indisponível',
        code: 'MICROSOFT_CALENDAR_NOT_CONFIGURED',
      })
    }
  }

  async oauthCallback(req: AuthenticatedRequest, reply: FastifyReply) {
    const code = (req.query as { code?: string }).code
    const state = (req.query as { state?: string }).state
    const webBase = process.env.WEB_PUBLIC_URL?.trim() || 'http://localhost:5173'
    if (!code || !state) {
      return reply.redirect(`${webBase}/settings?calendar=error`)
    }
    try {
      const { returnTo } = await this.service.handleOAuthCallback(code, state)
      return reply.redirect(`${webBase}${returnTo}${returnTo.includes('?') ? '&' : '?'}calendar=connected&provider=microsoft`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'callback_failed'
      return reply.redirect(`${webBase}/settings?calendar=error&reason=${encodeURIComponent(msg)}`)
    }
  }

  async status(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const parsed = patientIdQuery.safeParse(req.query)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const status = await this.service.getStatus(req.accountId, parsed.data.patientId)
    return reply.send(status)
  }

  async sync(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const parsed = syncBodySchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    try {
      const result = await this.service.sync(req.accountId, parsed.data.patientId)
      return reply.send(result)
    } catch (err) {
      return reply.status(400).send({
        message: err instanceof Error ? err.message : 'Sync falhou',
      })
    }
  }

  async disconnect(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const parsed = syncBodySchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    await this.service.disconnect(req.accountId, parsed.data.patientId)
    return reply.send({ ok: true })
  }
}
