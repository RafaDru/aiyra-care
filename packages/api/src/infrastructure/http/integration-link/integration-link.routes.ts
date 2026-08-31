import type { FastifyInstance } from 'fastify'
import { IntegrationLinkPgRepository } from '../../persistence/integration-link.pg.repository.js'
import { IntegrationLinkController } from './integration-link.controller.js'
import { bindSyncCompletionNotifier, publishSyncCompletion } from '../../sync/sync-completion.bus.js'
import { pgPool } from '../../../db/postgres.js'
import { getDataGenerationService } from '../account-freshness/account-freshness.routes.js'
import { PatientAccountPgResolver } from '../../persistence/hygiene.pg.repository.js'

export async function integrationLinkRoutes(app: FastifyInstance) {
  const repo = new IntegrationLinkPgRepository(pgPool)
  const dataGen = getDataGenerationService()
  const accountResolver = new PatientAccountPgResolver(pgPool)
  bindSyncCompletionNotifier(async (event) => {
    const link = await repo.findById(event.integrationLinkId)
    if (!link) return
    publishSyncCompletion({ ...event, patientId: link.patientId })
    if (event.status === 'success') {
      try {
        const accountId = await accountResolver.resolveAccountIdForPatient(link.patientId)
        if (accountId) {
          await dataGen.bumpAfterSyncSuccess(accountId, link.patientId, event.novelty)
        }
      } catch {
        // freshness bump must not break sync
      }
    }
  })
  const ctrl = new IntegrationLinkController(repo, pgPool)
  app.post('/integration-links', ctrl.create.bind(ctrl))
  app.get('/integration-links', ctrl.findByPatient.bind(ctrl))
  app.patch('/integration-links/:id', ctrl.update.bind(ctrl))
  app.delete('/integration-links/:id', ctrl.delete.bind(ctrl))
  app.post('/integration-links/:id/sync', ctrl.sync.bind(ctrl))
  app.post('/integration-links/:id/virtual-card', ctrl.virtualCard.bind(ctrl))
  app.get('/integration-links/:id/sync-status', ctrl.syncStatus.bind(ctrl))
  app.get('/integration-links/sync-progress/:jobId', ctrl.syncProgress.bind(ctrl))
  app.get('/integration-links/sync-progress/:jobId/stream', ctrl.syncProgressStream.bind(ctrl))
}
