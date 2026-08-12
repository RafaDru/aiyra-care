import type { FastifyInstance } from 'fastify'
import { GraphController } from './graph.controller.js'

export async function graphRoutes(app: FastifyInstance) {
  const ctrl = new GraphController()

  app.get('/patients/:id/graph/clinical-flow', ctrl.clinicalFlow.bind(ctrl))
  app.get('/patients/:id/graph/clinical-paths', ctrl.clinicalPaths.bind(ctrl))
  app.get('/patients/:id/timeline/graph', ctrl.graphTimeline.bind(ctrl))
}
