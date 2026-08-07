import type { FastifyRequest, FastifyReply } from 'fastify'
import type { AuthService } from '../../../application/auth/auth.service.js'
import type { PatientMembershipRepository } from '../../../domain/auth/app-account.repository.js'

export type AuthenticatedRequest = FastifyRequest & {
  accountId?: string
  authSubject?: string
  allowedPatientIds?: ReadonlySet<string>
}

export function createAuthHook(
  authService: AuthService,
  required = false,
  memberships?: PatientMembershipRepository,
) {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const header = request.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      if (required) return reply.status(401).send({ message: 'Token ausente' })
      return
    }
    const token = header.slice(7)
    const synced = await authService.syncAccountFromToken(token)
    if (!synced) {
      if (required) return reply.status(401).send({ message: 'Token inválido' })
      return
    }
    request.accountId = synced.account.id
    request.authSubject = synced.account.authSubject
    if (memberships) {
      const ids = await memberships.listAccessiblePatientIds(synced.account.id)
      request.allowedPatientIds = new Set(ids)
    }
  }
}
