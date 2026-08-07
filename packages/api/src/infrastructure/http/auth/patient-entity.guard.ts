import type { FastifyReply } from 'fastify'
import type { AuthenticatedRequest } from './auth.middleware.js'
import { assertEntityPatientAccess } from './patient-access.guard.js'

export async function guardPatientEntity<T extends { patientId: string }>(
  req: AuthenticatedRequest,
  reply: FastifyReply,
  entity: T | null | undefined,
  notFoundMessage = 'Not found',
): Promise<T | null> {
  if (!entity) {
    reply.status(404).send({ message: notFoundMessage })
    return null
  }
  if (!assertEntityPatientAccess(req, reply, entity)) return null
  return entity
}
