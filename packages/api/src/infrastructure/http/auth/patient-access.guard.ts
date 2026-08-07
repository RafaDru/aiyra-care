import type { FastifyReply } from 'fastify'
import type { AuthenticatedRequest } from './auth.middleware.js'

export function isAuthEnforcementEnabled(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE)
}

export function getAllowedPatientIds(req: AuthenticatedRequest): ReadonlySet<string> {
  return req.allowedPatientIds ?? new Set()
}

/** Garante acesso ao paciente derivado da sessão (nunca de parâmetros de conta). */
export function assertPatientAccess(
  req: AuthenticatedRequest,
  reply: FastifyReply,
  patientId: string,
): boolean {
  if (!isAuthEnforcementEnabled()) return true
  const allowed = getAllowedPatientIds(req)
  if (!allowed.has(patientId)) {
    reply.status(403).send({ message: 'Acesso negado a este paciente' })
    return false
  }
  return true
}

export function filterByPatientAccess<T>(
  req: AuthenticatedRequest,
  items: T[],
  getPatientId: (item: T) => string,
): T[] {
  if (!isAuthEnforcementEnabled()) return items
  const allowed = getAllowedPatientIds(req)
  return items.filter((item) => allowed.has(getPatientId(item)))
}

export function assertEntityPatientAccess(
  req: AuthenticatedRequest,
  reply: FastifyReply,
  entity: { patientId: string },
): boolean {
  return assertPatientAccess(req, reply, entity.patientId)
}
