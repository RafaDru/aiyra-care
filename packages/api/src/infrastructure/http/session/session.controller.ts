import type { FastifyReply } from 'fastify'
import { readHistoricoSessions } from '../../docs/historico.parser.js'

export class SessionController {
  async list(_req: unknown, reply: FastifyReply) {
    try {
      return reply.send(readHistoricoSessions())
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar sessões'
      return reply.status(500).send({ message })
    }
  }
}
