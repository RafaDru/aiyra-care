import type { FastifyRequest, FastifyReply } from 'fastify'
import { ProjectContextService } from '../../../application/project/project-context.service.js'

export class ProjectContextController {
  constructor(private readonly service: ProjectContextService) {}

  async getContext(_req: FastifyRequest, reply: FastifyReply) {
    try {
      const context = this.service.build()
      return reply.send(context)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao montar contexto do projeto'
      return reply.status(500).send({ message })
    }
  }
}
