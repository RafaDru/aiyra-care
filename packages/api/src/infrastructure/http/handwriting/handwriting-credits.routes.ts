import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'
import { HandwritingCreditsService } from '../../../application/handwriting/handwriting-credits.service.js'
import { HandwritingCreditsPgRepository } from '../../persistence/handwriting-credits.pg.repository.js'
import {
  handwritingAdminKey,
  isHandwritingInterpretationEnabled,
} from '../../../domain/document/handwriting-policy.js'
import { pgPool } from '../../../db/postgres.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { resolveHandwritingScopeId } from './handwriting-scope.js'

const grantSchema = z.object({
  scopeId: z.string().min(1).max(64).optional(),
  credits: z.number().int().positive().max(100_000),
  packageName: z.string().max(120).optional(),
  reference: z.string().max(120).optional(),
})

export async function handwritingCreditsRoutes(app: FastifyInstance) {
  const service = new HandwritingCreditsService(new HandwritingCreditsPgRepository(pgPool))

  app.get('/handwriting-credits/quota', async (req: AuthenticatedRequest, reply: FastifyReply) => {
    const scopeId = resolveHandwritingScopeId(req)
    const quota = await service.getQuota(scopeId)
    return reply.send({
      ...quota,
      paidOcrAllowed: process.env.OCR_ALLOW_PAID !== '0' && process.env.OCR_ALLOW_PAID !== 'false',
    })
  })

  app.post('/handwriting-credits/packages', async (req: AuthenticatedRequest, reply: FastifyReply) => {
    const adminKey = handwritingAdminKey()
    const headerKey = req.headers['x-handwriting-admin-key']
    if (!adminKey || headerKey !== adminKey) {
      return reply.status(401).send({ message: 'Não autorizado' })
    }
    const parsed = grantSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const scopeId = parsed.data.scopeId ?? resolveHandwritingScopeId(req)
    const quota = await service.grantPackage(scopeId, parsed.data.credits, {
      packageName: parsed.data.packageName,
      reference: parsed.data.reference,
    })
    return reply.send({
      message: `Pacote de ${parsed.data.credits} interpretação(ões) creditado`,
      quota,
    })
  })

  app.get('/handwriting-credits/status', async (_req, reply: FastifyReply) => {
    return reply.send({
      interpretationEnabled: isHandwritingInterpretationEnabled(),
    })
  })
}
