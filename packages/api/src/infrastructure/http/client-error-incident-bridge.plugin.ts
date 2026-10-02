import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { ClientErrorIncidentBridgeService } from '../../application/ops/client-error-incident-bridge.service.js'
import { resolveDeploymentTier } from '../../domain/ops/investigator-environment.js'
import type { AuthenticatedRequest } from './auth/auth.middleware.js'

function asHttpError(error: unknown): Error & { statusCode?: number } {
  if (error instanceof Error) return error
  return Object.assign(new Error(String(error)), { statusCode: 500 })
}

export function registerClientErrorIncidentErrorHandler(
  app: FastifyInstance,
  bridge: ClientErrorIncidentBridgeService | null,
): void {
  if (!bridge?.isEnabled()) return

  app.setErrorHandler((rawError, request: FastifyRequest, reply: FastifyReply) => {
    const error = asHttpError(rawError)
    const statusCode =
      typeof error.statusCode === 'number' && error.statusCode >= 400
        ? error.statusCode
        : 500

    if (statusCode >= 500) {
      request.log.error({ err: error, url: request.url }, 'unhandled API error')
      const path = request.url.split('?')[0]
      const accountId = (request as AuthenticatedRequest).accountId ?? null
      void bridge.handleServerError({
        path,
        statusCode,
        accountId,
        deploymentTier: resolveDeploymentTier(),
      }).catch(() => undefined)
    }

    if (reply.sent) return

    const message =
      statusCode >= 500
        ? 'Internal Server Error'
        : (error.message || 'Request error')

    reply.status(statusCode).send({
      statusCode,
      error: statusCode >= 500 ? 'Internal Server Error' : error.name ?? 'Error',
      message,
    })
  })
}
