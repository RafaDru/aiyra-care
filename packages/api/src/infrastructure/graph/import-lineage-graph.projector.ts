import type { Driver } from 'neo4j-driver'
import type { Pool } from 'pg'
import type { Authorization } from '../../domain/authorization/authorization.entity.js'
import type { Exam } from '../../domain/exam/exam.entity.js'
import type { MedicalRecord } from '../../domain/medical-record/medical-record.entity.js'
import { AuthorizationPgRepository } from '../persistence/authorization.pg.repository.js'
import { ExamPgRepository } from '../persistence/exam.pg.repository.js'
import { MedicalRecordPgRepository } from '../persistence/medical-record.pg.repository.js'
import {
  ClinicalEntityGraphProjector,
  type CanonicalEntityProjection,
} from './clinical-entity-graph.projector.js'
import { isNeo4jSyncEnabled } from './neo4j-env.js'

export interface ProcessedRecordProjectionInput {
  patientId: string
  processedTable: string
  processedId: string
  batchId?: string
  rawRecordId?: string
  source?: string
}

export function normalizeDoctorKey(name: string | null | undefined, council: string | null | undefined): string | null {
  const n = (name ?? '').trim()
  if (!n) return null
  const normalized = n.toLowerCase().replace(/\s+/g, '_').slice(0, 80)
  const c = (council ?? '').trim()
  return c ? `doctor:${c}:${normalized}` : `doctor:${normalized}`
}

export function normalizeProcedureKey(code: string | null | undefined, description: string | null | undefined): string {
  const c = (code ?? '').trim()
  if (c) return `procedure:${c}`
  const d = (description ?? '').trim().toLowerCase().replace(/\s+/g, '_').slice(0, 80)
  return `procedure:${d || 'unknown'}`
}

const TABLE_TO_ENTITY: Record<string, string> = {
  exams: 'exam',
  medical_records: 'medical_record',
  authorizations: 'authorization',
}

export class ImportLineageGraphProjector {
  private readonly entityProjector: ClinicalEntityGraphProjector
  private readonly examRepo: ExamPgRepository
  private readonly recordRepo: MedicalRecordPgRepository
  private readonly authRepo: AuthorizationPgRepository

  constructor(
    private readonly driver: Driver,
    pool: Pool,
  ) {
    this.entityProjector = new ClinicalEntityGraphProjector(driver)
    this.examRepo = new ExamPgRepository(pool)
    this.recordRepo = new MedicalRecordPgRepository(pool)
    this.authRepo = new AuthorizationPgRepository(pool)
  }

  scheduleProcessedRecord(input: ProcessedRecordProjectionInput): void {
    if (!isNeo4jSyncEnabled()) return
    void this.projectProcessedRecord(input).catch((err) => {
      console.warn('[neo4j] Import lineage projection failed:', (err as Error).message)
    })
  }

  async projectProcessedRecord(input: ProcessedRecordProjectionInput): Promise<void> {
    if (!isNeo4jSyncEnabled()) return

    const entityType = TABLE_TO_ENTITY[input.processedTable]
    if (!entityType) return

    if (input.processedTable === 'exams') {
      const exam = await this.examRepo.findById(input.processedId)
      if (!exam) return
      await this.projectExam(exam, input)
      return
    }

    if (input.processedTable === 'medical_records') {
      const record = await this.recordRepo.findById(input.processedId)
      if (!record) return
      await this.projectMedicalRecord(record, input)
      return
    }

    if (input.processedTable === 'authorizations') {
      const auth = await this.authRepo.findById(input.processedId)
      if (!auth) return
      await this.projectAuthorization(auth, input)
    }
  }

  private async projectCanonical(input: CanonicalEntityProjection, meta: ProcessedRecordProjectionInput): Promise<void> {
    await this.entityProjector.projectCanonicalEntity(input)
    if (meta.rawRecordId) {
      await this.linkProvenance(meta, input.entityId, input.entityType)
    }
  }

  private async linkProvenance(
    meta: ProcessedRecordProjectionInput,
    entityId: string,
    entityType: string,
  ): Promise<void> {
    const label = entityType === 'exam' ? 'Exam'
      : entityType === 'medical_record' ? 'MedicalRecord'
        : entityType === 'authorization' ? 'Authorization'
          : 'ClinicalEntity'

    const session = this.driver.session()
    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `MERGE (r:ImportRawRecord {id: $rawId})
           SET r.batchId = $batchId, r.source = $source, r.patientId = $patientId
           MERGE (e:${label} {id: $entityId})
           MERGE (r)-[:IMPORTED_AS]->(e)`,
          {
            rawId: meta.rawRecordId,
            batchId: meta.batchId ?? null,
            source: meta.source ?? null,
            patientId: meta.patientId,
            entityId,
          },
        )
      })
    } finally {
      await session.close()
    }
  }

  private async projectExam(exam: Exam, meta: ProcessedRecordProjectionInput): Promise<void> {
    const json = exam.toJSON()
    await this.projectCanonical({
      patientId: json.patientId,
      entityType: 'exam',
      entityId: json.id,
      title: json.examType,
      date: json.examDate.toISOString(),
      source: json.source,
    }, meta)
  }

  private async projectMedicalRecord(record: MedicalRecord, meta: ProcessedRecordProjectionInput): Promise<void> {
    const json = record.toJSON()
    const title = json.doctorName
      ? `${json.recordType ?? 'Consulta'} — ${json.doctorName}`
      : (json.recordType ?? 'Consulta')
    await this.projectCanonical({
      patientId: json.patientId,
      entityType: 'medical_record',
      entityId: json.id,
      title,
      date: json.recordDate.toISOString(),
      source: json.source,
    }, meta)

    if (json.doctorName) {
      await this.mergeDoctor(json.patientId, json.doctorName, json.doctorCrm, json.id, 'medical_record')
    }
  }

  private async projectAuthorization(auth: Authorization, meta: ProcessedRecordProjectionInput): Promise<void> {
    const json = auth.toJSON()
    const title = json.procedureDescription ?? json.classification ?? json.solicitationNumber ?? 'Autorização'
    await this.projectCanonical({
      patientId: json.patientId,
      entityType: 'authorization',
      entityId: json.id,
      title,
      date: json.authorizationDate?.toISOString() ?? json.validityDate?.toISOString() ?? null,
      source: json.source,
    }, meta)

    const session = this.driver.session()
    try {
      await session.executeWrite(async (tx) => {
        if (json.medicalRecordId) {
          await tx.run(
            `MATCH (m:MedicalRecord {id: $recordId})
             MATCH (a:Authorization {id: $authId})
             MERGE (m)-[:ORDERED {source: 'import_lineage'}]->(a)`,
            { recordId: json.medicalRecordId, authId: json.id },
          )
        }

        const doctorId = normalizeDoctorKey(json.doctorName, json.doctorCouncil)
        if (doctorId && json.doctorName) {
          await tx.run(
            `MERGE (d:Doctor {id: $doctorId})
             SET d.name = $name, d.council = $council
             MATCH (a:Authorization {id: $authId})
             MERGE (a)-[:ATTENDED_BY]->(d)`,
            {
              doctorId,
              name: json.doctorName,
              council: json.doctorCouncil ?? null,
              authId: json.id,
            },
          )
        }

        for (const item of json.items ?? []) {
          const procId = normalizeProcedureKey(item.procedureCode, item.procedureDescription)
          await tx.run(
            `MERGE (pr:Procedure {id: $procId})
             SET pr.code = $code, pr.description = $description
             MATCH (a:Authorization {id: $authId})
             MERGE (a)-[:INCLUDES]->(pr)`,
            {
              procId,
              code: item.procedureCode ?? null,
              description: item.procedureDescription ?? null,
              authId: json.id,
            },
          )
        }
      })
    } finally {
      await session.close()
    }

    if (json.doctorName) {
      await this.mergeDoctor(json.patientId, json.doctorName, json.doctorCouncil, json.id, 'authorization')
    }
  }

  private async mergeDoctor(
    patientId: string,
    name: string,
    council: string | null | undefined,
    entityId: string,
    entityType: 'medical_record' | 'authorization',
  ): Promise<void> {
    const doctorId = normalizeDoctorKey(name, council)
    if (!doctorId) return

    const label = entityType === 'medical_record' ? 'MedicalRecord' : 'Authorization'
    const session = this.driver.session()
    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `MERGE (d:Doctor {id: $doctorId})
           SET d.name = $name, d.council = $council
           MATCH (e:${label} {id: $entityId})
           MERGE (e)-[:ATTENDED_BY]->(d)
           MERGE (p:Patient {id: $patientId})
           MERGE (p)-[:HAS_RECORD]->(d)`,
          { doctorId, name, council: council ?? null, entityId, patientId },
        )
      })
    } finally {
      await session.close()
    }
  }
}
