import type { FastifyReply } from 'fastify'
import type { AvaChatService } from '../../../application/llm/ava-chat.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess } from '../auth/patient-access.guard.js'
import { resolveHandwritingScopeId } from '../handwriting/handwriting-scope.js'
import { chunkReplyForSse } from '../../../domain/llm/ava-reply-stream.js'
import { avaChatBodySchema, avaChatParamsSchema } from './ava.schema.js'

function writeSse(res: import('node:http').ServerResponse, event: string, data: unknown) {
  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

export class AvaController {
  constructor(private readonly avaChat: AvaChatService) {}

  async chat(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = avaChatParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })

    if (!assertPatientAccess(req, reply, params.data.id)) return

    const body = avaChatBodySchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const chatInput = {
      scopeId: resolveHandwritingScopeId(req),
      accountId: req.accountId,
      patientId: params.data.id,
      message: body.data.message,
      healthThreadId: body.data.healthThreadId,
      conversationId: body.data.conversationId,
      attachmentDocumentId: body.data.attachmentDocumentId,
      history: body.data.history,
      allowLlmDataSharing: body.data.allowLlmDataSharing ?? false,
      entityPin: body.data.entityPin,
    }

    if (body.data.streamActivity) {
      const res = reply.raw
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      })
      res.write('\n')

      try {
        let replyDeltaSent = false
        const result = await this.avaChat.chat(chatInput, {
          activity: (event) => writeSse(res, 'activity', event),
          replyDelta: (chunk) => {
            replyDeltaSent = true
            writeSse(res, 'reply_delta', { text: chunk })
          },
        })
        if (!replyDeltaSent && result.reply) {
          for (const chunk of chunkReplyForSse(result.reply)) {
            writeSse(res, 'reply_delta', { text: chunk })
          }
        }
        writeSse(res, 'complete', result)
        res.end()
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        if (message === 'LLM_QUOTA_EXCEEDED') {
          writeSse(res, 'error', { code: 'LLM_QUOTA_EXCEEDED', message: 'Franquia de IA esgotada.' })
        } else if (message === 'AVA_LLM_DISABLED') {
          writeSse(res, 'error', { code: 'AVA_LLM_DISABLED', message: 'Ava com LLM desabilitada.' })
        } else {
          writeSse(res, 'error', { code: 'AVA_CHAT_FAILED', message })
        }
        res.end()
      }
      return reply
    }

    try {
      const result = await this.avaChat.chat(chatInput)
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
      if (message === 'AVA_CONVERSATION_NOT_FOUND' || message === 'AVA_CONVERSATION_PATIENT_MISMATCH') {
        return reply.status(404).send({ message: 'Conversa não encontrada', code: message })
      }
      if (message === 'AVA_ATTACHMENT_INVALID' || message === 'AVA_ATTACHMENT_NOT_FOUND') {
        return reply.status(400).send({ message: 'Documento anexado inválido', code: message })
      }
      return reply.status(500).send({ message })
    }
  }
}
