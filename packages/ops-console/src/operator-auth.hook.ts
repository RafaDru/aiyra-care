import type { FastifyInstance, FastifyReply } from 'fastify'
import {
  extractBearerToken,
  isOpsConsoleAuthExempt,
  isSupabaseConfiguredForOpsConsole,
  normalizeOpsConsolePath,
  parseOperatorEmailAllowlist,
  resolveOpsConsoleAuthEnabled,
  verifyOpsConsoleOperatorToken,
  type OpsConsoleAuthenticatedRequest,
  type OpsConsoleDeploymentTier,
} from './operator-auth.js'

export type RegisterOpsConsoleAuthHookOptions = {
  host: string
  deploymentTier: OpsConsoleDeploymentTier
}

export function registerOpsConsoleAuthHook(
  app: FastifyInstance,
  options: RegisterOpsConsoleAuthHookOptions,
): { enabled: boolean } {
  const enabled = resolveOpsConsoleAuthEnabled(options.deploymentTier, options.host)
  if (!enabled) return { enabled: false }

  const allowlist = parseOperatorEmailAllowlist()

  app.addHook('onRequest', async (request, reply: FastifyReply) => {
    const path = normalizeOpsConsolePath(request.url)
    const method = request.method

    if (isOpsConsoleAuthExempt({ method, path })) {
      return
    }

    if (!isSupabaseConfiguredForOpsConsole()) {
      return reply.status(503).send({
        error: 'auth_misconfigured',
        code: 'OPS_CONSOLE_SUPABASE_MISSING',
        message: 'Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE no ops-console.',
      })
    }

    if (allowlist.size === 0) {
      return reply.status(503).send({
        error: 'auth_misconfigured',
        code: 'OPS_CONSOLE_OPERATOR_ALLOWLIST_EMPTY',
        message: 'Defina OPS_CONSOLE_OPERATOR_EMAILS com e-mails de operadores autorizados.',
      })
    }

    const token = extractBearerToken(request.headers.authorization)
    if (!token) {
      return reply.status(401).send({
        error: 'unauthorized',
        code: 'OPS_CONSOLE_AUTH_REQUIRED',
        message: 'Token de operador ausente.',
      })
    }

    const operator = await verifyOpsConsoleOperatorToken(token, allowlist)
    if (!operator) {
      return reply.status(403).send({
        error: 'forbidden',
        code: 'OPS_CONSOLE_OPERATOR_DENIED',
        message: 'Conta não autorizada para o Command Hub.',
      })
    }

    ;(request as OpsConsoleAuthenticatedRequest).opsConsoleOperatorEmail = operator.email
  })

  return { enabled: true }
}