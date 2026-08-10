import type { FastifyInstance } from 'fastify'
import { RoadmapController } from './roadmap.controller.js'

export async function roadmapRoutes(app: FastifyInstance) {
  const ctrl = new RoadmapController()
  app.get('/roadmap', ctrl.get.bind(ctrl))
}
