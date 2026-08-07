import type { FastifyInstance } from 'fastify'
import { HealthThreadController } from './health-thread.controller.js'
import { HealthThreadService } from '../../../application/health-thread/health-thread.service.js'
import { HealthThreadWorkflowService } from '../../../application/health-thread/health-thread-workflow.service.js'
import { HealthThreadPgRepository } from '../../persistence/health-thread.pg.repository.js'
import { HealthThreadEntryPgRepository } from '../../persistence/health-thread-entry.pg.repository.js'
import { HealthThreadLinkPgRepository } from '../../persistence/health-thread-link.pg.repository.js'
import { ExamPgRepository } from '../../persistence/exam.pg.repository.js'
import { MedicalRecordPgRepository } from '../../persistence/medical-record.pg.repository.js'
import { AuthorizationPgRepository } from '../../persistence/authorization.pg.repository.js'
import { AllergyPgRepository } from '../../persistence/allergy.pg.repository.js'
import { DiagnosisPgRepository } from '../../persistence/diagnosis.pg.repository.js'
import { MedicationPgRepository } from '../../persistence/medication.pg.repository.js'
import { VaccinePgRepository } from '../../persistence/vaccine.pg.repository.js'
import { DocumentPgRepository } from '../../persistence/document.pg.repository.js'
import { pgPool } from '../../../db/postgres.js'
import { neo4jDriver } from '../../../db/neo4j.js'
import { HealthThreadGraphProjector } from '../../graph/health-thread-graph.projector.js'

export async function healthThreadRoutes(app: FastifyInstance) {
  const threadRepo = new HealthThreadPgRepository(pgPool)
  const graphProjector = new HealthThreadGraphProjector(neo4jDriver)
  const threadService = new HealthThreadService(threadRepo, graphProjector)
  const workflow = new HealthThreadWorkflowService(
    pgPool,
    threadService,
    new HealthThreadEntryPgRepository(pgPool),
    new HealthThreadLinkPgRepository(pgPool),
    new ExamPgRepository(pgPool),
    new MedicalRecordPgRepository(pgPool),
    new AuthorizationPgRepository(pgPool),
    new AllergyPgRepository(pgPool),
    new DiagnosisPgRepository(pgPool),
    new MedicationPgRepository(pgPool),
    new VaccinePgRepository(pgPool),
    new DocumentPgRepository(pgPool),
    graphProjector,
  )
  const controller = new HealthThreadController(threadService, workflow)

  app.post('/health-threads/wizard/investigation', controller.wizardInvestigation.bind(controller))
  app.post('/health-threads/wizard/task', controller.wizardTask.bind(controller))
  app.post('/health-threads', controller.create.bind(controller))
  app.get('/health-threads', controller.findAll.bind(controller))
  app.get('/health-threads/:id/detail', controller.getDetail.bind(controller))
  app.post('/health-threads/:id/entries', controller.addEntry.bind(controller))
  app.post('/health-threads/:id/artifacts/exam', controller.createExamArtifact.bind(controller))
  app.post('/health-threads/:id/artifacts/medical-record', controller.createMedicalRecordArtifact.bind(controller))
  app.post('/health-threads/:id/artifacts/authorization', controller.createAuthorizationArtifact.bind(controller))
  app.post('/health-threads/:id/artifacts/medication', controller.createMedicationArtifact.bind(controller))
  app.post('/health-threads/:id/artifacts/vaccine', controller.createVaccineArtifact.bind(controller))
  app.post('/health-threads/:id/convert/allergy', controller.convertToAllergy.bind(controller))
  app.post('/health-threads/:id/convert/diagnosis', controller.convertToDiagnosis.bind(controller))
  app.post('/health-threads/:id/links', controller.linkArtifact.bind(controller))
  app.get('/health-threads/:id', controller.findById.bind(controller))
  app.patch('/health-threads/:id', controller.update.bind(controller))
  app.post('/health-threads/:id/close', controller.close.bind(controller))
  app.delete('/health-threads/:id', controller.delete.bind(controller))
}
