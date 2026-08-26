import type { FastifyInstance } from 'fastify'
import { isSensitiveBodyRoute } from './log-sanitization.js'

/**
 * Marca requests sensíveis e evita que serializers futuros incluam body.
 * A sanitização principal está em createApiLoggerConfig (pino redact + hooks).
 */
export async function registerLogSanitizationPlugin(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', async (req) => {
    if (isSensitiveBodyRoute(req.url)) {
      req.log = req.log.child({ sensitiveRoute: true })
    }
  })
}
