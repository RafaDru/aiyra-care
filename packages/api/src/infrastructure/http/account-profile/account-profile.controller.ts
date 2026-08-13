import type { FastifyReply } from 'fastify'
import type { AccountProfileService } from '../../../application/account-profile/account-profile.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { updateAccountProfileSchema, toProfileProps } from './account-profile.schema.js'

export class AccountProfileController {
  constructor(private readonly service: AccountProfileService) {}

  async get(request: AuthenticatedRequest, reply: FastifyReply) {
    if (!request.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const profile = await this.service.getProfile(request.accountId)
    if (!profile) return reply.status(404).send({ message: 'Conta não encontrada' })
    return reply.send(profile)
  }

  async update(request: AuthenticatedRequest, reply: FastifyReply) {
    if (!request.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const parsed = updateAccountProfileSchema.safeParse(request.body ?? {})
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    const updated = await this.service.updateProfile(request.accountId, toProfileProps(parsed.data))
    return reply.send(updated)
  }
}
