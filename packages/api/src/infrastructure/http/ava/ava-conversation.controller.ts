import type { FastifyReply } from 'fastify'
import type { AvaConversationService } from '../../../application/llm/ava-conversation.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess } from '../auth/patient-access.guard.js'
import {
  avaConversationCreateBodySchema,
  avaConversationListQuerySchema,
  avaConversationParamsSchema,
} from './ava-conversation.schema.js'

export class AvaConversationController {
  constructor(private readonly conversations: AvaConversationService) {}

  async list(req: AuthenticatedRequest, reply: FastifyReply) {
    const accountId = req.accountId
    if (!accountId) return reply.status(401).send({ error: 'unauthorized' })

    const query = avaConversationListQuerySchema.safeParse(req.query)
    if (!query.success) return reply.status(400).send({ error: query.error.flatten() })

    if (query.data.patientId && !assertPatientAccess(req, reply, query.data.patientId)) return

    const items = await this.conversations.listForAccount(accountId, query.data.patientId)
    return reply.send({ items })
  }

  async create(req: AuthenticatedRequest, reply: FastifyReply) {
    const accountId = req.accountId
    if (!accountId) return reply.status(401).send({ error: 'unauthorized' })

    const body = avaConversationCreateBodySchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    if (!assertPatientAccess(req, reply, body.data.patientId)) return

    const conv = await this.conversations.create(accountId, body.data)
    return reply.status(201).send(conv)
  }

  async get(req: AuthenticatedRequest, reply: FastifyReply) {
    const accountId = req.accountId
    if (!accountId) return reply.status(401).send({ error: 'unauthorized' })

    const params = avaConversationParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })

    const conv = await this.conversations.getForAccount(accountId, params.data.conversationId)
    if (!conv) return reply.status(404).send({ message: 'Conversa não encontrada' })

    if (!assertPatientAccess(req, reply, conv.patientId)) return

    return reply.send(conv)
  }

  async messages(req: AuthenticatedRequest, reply: FastifyReply) {
    const accountId = req.accountId
    if (!accountId) return reply.status(401).send({ error: 'unauthorized' })

    const params = avaConversationParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })

    const loaded = await this.conversations.getMessages(accountId, params.data.conversationId)
    if (!loaded) return reply.status(404).send({ message: 'Conversa não encontrada' })

    if (!assertPatientAccess(req, reply, loaded.conversation.patientId)) return

    return reply.send(loaded)
  }
}
