import type { FastifyInstance } from 'fastify'
import { ClinicalLinkController } from './clinical-link.controller.js'
import { ClinicalLinkService } from '../../../application/clinical-link/clinical-link.service.js'
import { ClinicalEntityLinkPgRepository } from '../../persistence/clinical-entity-link.pg.repository.js'
import { RelationTypePgRepository } from '../../persistence/relation-type.pg.repository.js'
import { HealthThreadPgRepository } from '../../persistence/health-thread.pg.repository.js'
import { HealthThreadLinkPgRepository } from '../../persistence/health-thread-link.pg.repository.js'
import { ExamPgRepository } from '../../persistence/exam.pg.repository.js'
import { MedicalRecordPgRepository } from '../../persistence/medical-record.pg.repository.js'
import { AuthorizationPgRepository } from '../../persistence/authorization.pg.repository.js'
import { MedicationPgRepository } from '../../persistence/medication.pg.repository.js'
import { VaccinePgRepository } from '../../persistence/vaccine.pg.repository.js'
import { DiagnosisPgRepository } from '../../persistence/diagnosis.pg.repository.js'
import { HealthThreadService } from '../../../application/health-thread/health-thread.service.js'
import { ClinicalEntityGraphProjector } from '../../graph/clinical-entity-graph.projector.js'
import { pgPool } from '../../../db/postgres.js'
import { neo4jDriver } from '../../../db/neo4j.js'

export async function clinicalLinkRoutes(app: FastifyInstance) {
  const graphProjector = new ClinicalEntityGraphProjector(neo4jDriver)
  const service = new ClinicalLinkService(
    pgPool,
    new RelationTypePgRepository(pgPool),
    new ClinicalEntityLinkPgRepository(pgPool),
    new HealthThreadPgRepository(pgPool),
    new HealthThreadLinkPgRepository(pgPool),
    new ExamPgRepository(pgPool),
    new MedicalRecordPgRepository(pgPool),
    new AuthorizationPgRepository(pgPool),
    new MedicationPgRepository(pgPool),
    new VaccinePgRepository(pgPool),
    new DiagnosisPgRepository(pgPool),
    graphProjector,
  )
  const threadService = new HealthThreadService(new HealthThreadPgRepository(pgPool))
  const controller = new ClinicalLinkController(service, threadService)

  app.get('/relation-types', controller.listRelationTypes.bind(controller))
  app.get('/patients/:patientId/clinical-links', controller.list.bind(controller))
  app.post('/patients/:patientId/clinical-links', controller.create.bind(controller))
  app.get('/patients/:patientId/clinical-link-counts', controller.counts.bind(controller))
  app.delete('/clinical-links/:id', controller.delete.bind(controller))
  app.get('/health-threads/:id/clinical-flow', controller.threadFlow.bind(controller))
}
