import type { FastifyReply } from 'fastify'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'

export function resolveOpsMetricsKey(): string | undefined {
  return (
    process.env.OPS_METRICS_KEY?.trim()
    || process.env.LLM_INTERNAL_OBSERVABILITY_KEY?.trim()
    || undefined
  )
}

export function isOpsKeyAuthorized(req: AuthenticatedRequest): boolean {
  const opsKey = resolveOpsMetricsKey()
  if (!opsKey) return false
  return req.headers['x-internal-ops-key'] === opsKey
}

export function assertOpsMetricsAccess(
  req: AuthenticatedRequest,
  reply: FastifyReply,
): boolean {
  const opsKey = resolveOpsMetricsKey()
  if (!opsKey) return true
  if (req.headers['x-internal-ops-key'] === opsKey) return true
  reply.status(403).send({ error: 'ops key required', code: 'OPS_KEY_REQUIRED' })
  return false
}

export function isOpsRoute(path: string): boolean {
  return path === '/ops/metrics'
    || path === '/ops/alerts'
    || path === '/ops/alerts/check'
    || path === '/ops/dev-audit-bridge'
}
