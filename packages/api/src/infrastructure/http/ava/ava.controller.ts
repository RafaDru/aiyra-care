import type { FastifyReply } from 'fastify'
import type { AvaChatService } from '../../../application/llm/ava-chat.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess } from '../auth/patient-access.guard.js'
import { resolveHandwritingScopeId } from '../handwriting/handwriting-scope.js'
import { avaChatBodySchema, avaChatParamsSchema } from './ava.schema.js'

export class AvaController {
  constructor(private readonly avaChat: AvaChatService) {}

  async chat(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = avaChatParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })

    if (!assertPatientAccess(req, reply, params.data.id)) return

    const body = avaChatBodySchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    try {
      const result = await this.avaChat.chat({
        scopeId: resolveHandwritingScopeId(req),
        accountId: req.accountId,
        patientId: params.data.id,
        message: body.data.message,
        healthThreadId: body.data.healthThreadId,
        history: body.data.history,
        allowLlmDataSharing: body.data.allowLlmDataSharing ?? false,
      })
      return reply.send(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message === 'LLM_QUOTA_EXCEEDED') {
        return reply.status(402).send({
          message: 'Franquia de IA esgotada — adquira créditos ou aguarde o próximo ciclo.',
          code: 'LLM_QUOTA_EXCEEDED',
        })
      }
      if (message === 'AVA_LLM_DISABLED') {
        return reply.status(503).send({
          message: 'Ava com LLM desabilitada (configure OPENCODE_ZEN/GO, GEMINI_API_KEY ou GROQ_API_KEY)',
          code: 'AVA_LLM_DISABLED',
        })
      }
      return reply.status(500).send({ message })
    }
  }
}
