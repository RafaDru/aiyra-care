import type { FastifyInstance, FastifyReply } from 'fastify'
import type { AuthService } from '../../../application/auth/auth.service.js'
import { pgPool } from '../../../db/postgres.js'
import { PatientMembershipPgRepository } from '../../persistence/app-account.pg.repository.js'
import { createAuthHook, type AuthenticatedRequest } from './auth.middleware.js'
import { getLegalComplianceService } from '../legal-compliance/legal-compliance.routes.js'
import { isComplianceExemptPath, isComplianceGateEnabled } from '../legal-compliance/compliance-gate.js'
import { isOpsKeyAuthorized, isOpsRoute } from '../ops/ops-auth.js'

const PUBLIC_PATHS = new Set(['/health', '/health/db'])

function normalizePath(url: string): string {
  const path = url.split('?')[0]
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}

function isPublicCompliancePath(path: string): boolean {
  if (path === '/compliance/documents' || path === '/compliance/contact' || path === '/compliance/go-live-status') return true
  return /^\/compliance\/documents\/[a-z_]+\/current$/.test(path)
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
    if (PUBLIC_PATHS.has(path) || path.startsWith('/auth/') || path.startsWith('/clinical-export/share/') || path.startsWith('/calendar/google/oauth/callback') || path.startsWith('/calendar/microsoft/oauth/callback') || isPublicCompliancePath(path) || path === '/billing/webhook') return

    if (isOpsRoute(path) && isOpsKeyAuthorized(request as AuthenticatedRequest)) return

    await requireAuth(request as AuthenticatedRequest, reply)
    if (reply.sent) return

    if (isComplianceGateEnabled()) {
      const req = request as AuthenticatedRequest
      if (req.accountId && !isComplianceExemptPath(path)) {
        try {
          const compliance = getLegalComplianceService()
          const status = await compliance.getStatus(req.accountId)
          if (!status.compliant) {
            return reply.status(403).send({
              message: 'Aceite de termos e política de privacidade pendente',
              code: 'COMPLIANCE_PENDING',
              pendingKinds: status.pendingKinds,
            })
          }
        } catch (err) {
          app.log.warn({ err }, 'Compliance gate: falha ao verificar status — rota permitida')
        }
      }
    }
  })
}

export function isAuthEnforcementEnabled(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE)
}
