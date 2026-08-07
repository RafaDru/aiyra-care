import type { FastifyRequest, FastifyReply } from 'fastify'
import type { AuthService } from '../../../application/auth/auth.service.js'
import type { AuthenticatedRequest } from './auth.middleware.js'
import { completeProfileSchema } from './auth.schema.js'
import { ConflictError } from '../../../domain/errors.js'

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private syncPayload(synced: NonNullable<Awaited<ReturnType<AuthService['syncAccountFromToken']>>>) {
    return {
      account: synced.account.toJSON(),
      isNew: synced.isNew,
      needsProfile: synced.needsProfile,
    }
  }

  async me(request: AuthenticatedRequest, reply: FastifyReply) {
    const header = request.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return reply.status(401).send({ message: 'Token ausente' })
    }
    const synced = await this.authService.syncAccountFromToken(header.slice(7))
    if (!synced) return reply.status(401).send({ message: 'Token inválido' })
    return reply.send(this.syncPayload(synced))
  }

  async sync(request: FastifyRequest, reply: FastifyReply) {
    const header = request.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return reply.status(401).send({ message: 'Token ausente' })
    }
    const synced = await this.authService.syncAccountFromToken(header.slice(7))
    if (!synced) return reply.status(401).send({ message: 'Token inválido' })
    return reply.send(this.syncPayload(synced))
  }

  async completeProfile(request: AuthenticatedRequest, reply: FastifyReply) {
    if (!request.accountId) {
      return reply.status(401).send({ message: 'Token ausente' })
    }
    const parsed = completeProfileSchema.safeParse(request.body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return reply.status(400).send({ message: issue?.message ?? 'Dados inválidos' })
    }
    try {
      const result = await this.authService.completeProfile(request.accountId, parsed.data)
      return reply.status(201).send({
        patient: result.patient.toJSON(),
        needsProfile: result.needsProfile,
      })
    } catch (err) {
      if (err instanceof ConflictError) return reply.status(409).send({ message: err.message })
      throw err
    }
  }
}
