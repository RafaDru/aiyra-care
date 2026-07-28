import type { FastifyInstance } from 'fastify'
import { IntegrationLinkPgRepository } from '../../persistence/integration-link.pg.repository.js'
import { IntegrationLinkController } from './integration-link.controller.js'
import { pgPool } from '../../../db/postgres.js'

export async function integrationLinkRoutes(app: FastifyInstance) {
  const repo = new IntegrationLinkPgRepository(pgPool)
  const ctrl = new IntegrationLinkController(repo, pgPool)
  app.post('/integration-links', ctrl.create.bind(ctrl))
  app.get('/integration-links', ctrl.findByPatient.bind(ctrl))
  app.patch('/integration-links/:id', ctrl.update.bind(ctrl))
  app.delete('/integration-links/:id', ctrl.delete.bind(ctrl))
  app.post('/integration-links/:id/sync', ctrl.sync.bind(ctrl))
  app.get('/integration-links/sync-progress/:jobId', ctrl.syncProgress.bind(ctrl))
}
