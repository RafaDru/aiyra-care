import type { FastifyReply } from 'fastify'
import type { AvaProposedActionService } from '../../../application/llm/ava-proposed-action.service.js'
import type { AvaContextSuggestionsService } from '../../../application/llm/ava-context-suggestions.service.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess } from '../auth/patient-access.guard.js'
import { avaActionExecuteSchema, avaContextSuggestionsParamsSchema } from './ava-action.schema.js'

export class AvaActionController {
  constructor(
    private readonly actions: AvaProposedActionService,
    private readonly suggestions: AvaContextSuggestionsService,
  ) {}

  async contextSuggestions(req: AuthenticatedRequest, reply: FastifyReply) {
    const params = avaContextSuggestionsParamsSchema.safeParse(req.params)
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() })
    if (!assertPatientAccess(req, reply, params.data.id)) return

    const items = await this.suggestions.listForPatient(params.data.id)
    return reply.send({ items })
  }

  async execute(req: AuthenticatedRequest, reply: FastifyReply) {
    if (!req.accountId) return reply.status(401).send({ message: 'Não autenticado' })
    const body = avaActionExecuteSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const patientId = body.data.payload.patientId
      ? String(body.data.payload.patientId)
      : undefined
    if (patientId && !assertPatientAccess(req, reply, patientId)) return

    try {
      const result = await this.actions.execute(
        req.accountId!,
        req.accountId!,
        { type: body.data.type, payload: body.data.payload },
      )
      return reply.send(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message === 'AVA_ACTION_LINK_NOT_FOUND' || message === 'HYGIENE_CANDIDATE_NOT_FOUND') {
        return reply.status(404).send({ message, code: message })
      }
      if (message === 'AVA_ACTION_UNKNOWN') {
        return reply.status(400).send({ message, code: message })
      }
      return reply.status(500).send({ message })
    }
  }
}
