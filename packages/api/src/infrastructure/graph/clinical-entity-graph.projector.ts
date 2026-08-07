import type { Driver } from 'neo4j-driver'
import type { ClinicalEntityLink } from '../../domain/clinical-link/clinical-entity-link.entity.js'
import type { RelationType } from '../../domain/clinical-link/relation-type.entity.js'
import { isNeo4jSyncEnabled } from './health-thread-graph.projector.js'

const ENTITY_LABEL: Record<string, string> = {
  exam: 'Exam',
  medical_record: 'MedicalRecord',
  authorization: 'Authorization',
  diagnosis: 'Diagnosis',
  medication: 'Medication',
  vaccine: 'Vaccine',
  health_thread: 'HealthThread',
}

const ALLOWED_REL_TYPES = new Set([
  'ORDERED',
  'AUTHORIZED_FOR',
  'RESULT_OF',
  'PRESCRIBED',
  'CONFIRMS',
  'SUPPORTS',
  'SUGGESTS',
  'RELATED',
])

export class ClinicalEntityGraphProjector {
  constructor(private readonly driver: Driver) {}

  scheduleLink(link: ClinicalEntityLink, relationType: RelationType): void {
    if (!isNeo4jSyncEnabled()) return
    void this.projectLink(link, relationType).catch((err) => {
      console.warn('[neo4j] ClinicalEntityLink projection failed:', (err as Error).message)
    })
  }

  scheduleUnlink(link: ClinicalEntityLink, relationType: RelationType): void {
    if (!isNeo4jSyncEnabled()) return
    void this.deleteLink(link, relationType).catch((err) => {
      console.warn('[neo4j] ClinicalEntityLink delete failed:', (err as Error).message)
    })
  }

  async projectLink(link: ClinicalEntityLink, relationType: RelationType): Promise<void> {
    const relType = relationType.neo4jRelType
    if (!ALLOWED_REL_TYPES.has(relType)) return

    const data = link.toJSON()
    const fromLabel = ENTITY_LABEL[data.fromEntityType] ?? 'ClinicalEntity'
    const toLabel = ENTITY_LABEL[data.toEntityType] ?? 'ClinicalEntity'

    const session = this.driver.session()
    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `MERGE (p:Patient {id: $patientId})`,
          { patientId: data.patientId },
        )

        await tx.run(
          `MERGE (a:${fromLabel} {id: $entityId})
           SET a.type = $entityType, a.patientId = $patientId`,
          {
            entityId: data.fromEntityId,
            entityType: data.fromEntityType,
            patientId: data.patientId,
          },
        )

        await tx.run(
          `MERGE (b:${toLabel} {id: $entityId})
           SET b.type = $entityType, b.patientId = $patientId`,
          {
            entityId: data.toEntityId,
            entityType: data.toEntityType,
            patientId: data.patientId,
          },
        )

        await tx.run(
          `MATCH (a:${fromLabel} {id: $fromId})
           MATCH (b:${toLabel} {id: $toId})
           MERGE (a)-[r:${relType} {linkId: $linkId}]->(b)
           SET r.relationCode = $relationCode,
               r.label = $label,
               r.patientId = $patientId,
               r.healthThreadId = $healthThreadId,
               r.createdAt = $createdAt`,
          {
            fromId: data.fromEntityId,
            toId: data.toEntityId,
            linkId: data.id,
            relationCode: data.relationCode,
            label: data.label,
            patientId: data.patientId,
            healthThreadId: data.healthThreadId,
            createdAt: data.createdAt.toISOString(),
          },
        )

        if (data.fromEntityType === 'exam' && data.toEntityType === 'health_thread') {
          await tx.run(
            `MATCH (e:Exam {id: $examId})
             MATCH (t:HealthThread {id: $threadId})
             MERGE (e)-[:LINKS_TO_THREAD {linkId: $linkId}]->(t)`,
            { examId: data.fromEntityId, threadId: data.toEntityId, linkId: data.id },
          )
        }
      })
    } finally {
      await session.close()
    }
  }

  async deleteLink(link: ClinicalEntityLink, relationType: RelationType): Promise<void> {
    const relType = relationType.neo4jRelType
    if (!ALLOWED_REL_TYPES.has(relType)) return

    const data = link.toJSON()
    const fromLabel = ENTITY_LABEL[data.fromEntityType] ?? 'ClinicalEntity'
    const toLabel = ENTITY_LABEL[data.toEntityType] ?? 'ClinicalEntity'

    const session = this.driver.session()
    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `MATCH (a:${fromLabel} {id: $fromId})-[r:${relType} {linkId: $linkId}]->(b:${toLabel} {id: $toId})
           DELETE r`,
          { fromId: data.fromEntityId, toId: data.toEntityId, linkId: data.id },
        )
      })
    } finally {
      await session.close()
    }
  }
}
