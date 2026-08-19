import type { FastifyReply } from 'fastify'
import type { EmergencyService } from '../../../application/emergency/emergency.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess } from '../auth/patient-access.guard.js'
import { guardPatientEntity } from '../auth/patient-entity.guard.js'
import { NotFoundError } from '../../../domain/errors.js'
import {
  directoryQuerySchema,
  contactQuerySchema,
  createContactSchema,
  updateContactSchema,
  contactParamsSchema,
} from './emergency.schema.js'

export class EmergencyController {
  constructor(private readonly service: EmergencyService) {}

  async listDirectory(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = directoryQuerySchema.safeParse(req.query)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const rows = await this.service.listDirectory({
      category: parsed.data.category,
      scope: parsed.data.scope,
      stateCode: parsed.data.stateCode,
    })
    return reply.send(rows)
  }

  async listContacts(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = contactQuerySchema.safeParse(req.query)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const rows = await this.service.listContacts(parsed.data.patientId)
    return reply.send(rows.map((r) => r.toJSON()))
  }

  async createContact(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = createContactSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.patientId)) return
    const row = await this.service.createContact(parsed.data)
    return reply.status(201).send(row.toJSON())
  }

  async updateContact(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = contactParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    const body = updateContactSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    try {
      const existing = await this.service.findContactById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      const row = await this.service.updateContact(params.data.id, body.data)
      return reply.send(row.toJSON())
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }

  async deleteContact(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = contactParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    try {
      const existing = await this.service.findContactById(params.data.id)
      if (!guardPatientEntity(req, reply, existing)) return
      await this.service.softDeleteContact(params.data.id, req.accountId ?? null)
      return reply.status(204).send()
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message })
      throw err
    }
  }
}
