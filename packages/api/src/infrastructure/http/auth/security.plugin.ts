import type { FastifyInstance, FastifyReply } from 'fastify'
import type { AuthService } from '../../../application/auth/auth.service.js'
import { pgPool } from '../../../db/postgres.js'
import { PatientMembershipPgRepository } from '../../persistence/app-account.pg.repository.js'
import { createAuthHook, type AuthenticatedRequest } from './auth.middleware.js'

const PUBLIC_PATHS = new Set(['/health', '/health/db'])

function normalizePath(url: string): string {
  const path = url.split('?')[0]
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}

export async function registerSecurityPlugin(app: FastifyInstance, authService: AuthService | null) {
  if (!isAuthEnforcementEnabled() || !authService) {
    if (!isAuthEnforcementEnabled()) {
      app.log.warn('Enforcement de auth desativado — defina SUPABASE_URL e SUPABASE_SERVICE_ROLE')
    }
    return
  }

  const memberships = new PatientMembershipPgRepository(pgPool)
  const requireAuth = createAuthHook(authService, true, memberships)

  app.addHook('onRequest', async (request, reply: FastifyReply) => {
    const path = normalizePath(request.url)
    if (PUBLIC_PATHS.has(path) || path.startsWith('/auth/')) return

    await requireAuth(request as AuthenticatedRequest, reply)
    if (reply.sent) return
  })
}

export function isAuthEnforcementEnabled(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE)
}
