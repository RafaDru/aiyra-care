import type { FastifyInstance } from 'fastify'
import { SessionController } from './session.controller.js'

export async function sessionsRoutes(app: FastifyInstance) {
  const ctrl = new SessionController()
  app.get('/sessions', ctrl.list.bind(ctrl))
}
