import type { FastifyInstance } from 'fastify'
import { ProjectContextService } from '../../../application/project/project-context.service.js'
import { ProjectContextController } from './project-context.controller.js'

export async function projectContextRoutes(app: FastifyInstance) {
  const service = new ProjectContextService()
  const controller = new ProjectContextController(service)
  app.get('/project/context', controller.getContext.bind(controller))
}
