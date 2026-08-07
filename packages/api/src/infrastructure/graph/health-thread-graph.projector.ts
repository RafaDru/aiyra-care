import type { Driver } from 'neo4j-driver'
import type { HealthThread } from '../../domain/health-thread/health-thread.entity.js'
import type { HealthThreadLink } from '../../domain/health-thread/health-thread-link.entity.js'

export function isNeo4jSyncEnabled(): boolean {
  const flag = process.env.NEO4J_SYNC_ENABLED
  return flag === '1' || flag === 'true'
}

const ENTITY_LABEL: Record<string, string> = {
  exam: 'Exam',
  medical_record: 'MedicalRecord',
  authorization: 'Authorization',
  diagnosis: 'Diagnosis',
  document: 'Document',
  allergy: 'Allergen',
  appointment: 'Appointment',
  medication: 'Medication',
  vaccine: 'Vaccine',
}

export class HealthThreadGraphProjector {
  constructor(private readonly driver: Driver) {}

  scheduleThread(thread: HealthThread): void {
    if (!isNeo4jSyncEnabled()) return
    void this.projectThread(thread).catch((err) => {
      console.warn('[neo4j] HealthThread projection failed:', (err as Error).message)
    })
  }

  scheduleLink(thread: HealthThread, link: HealthThreadLink): void {
    if (!isNeo4jSyncEnabled()) return
    void this.projectLink(thread, link).catch((err) => {
      console.warn('[neo4j] HealthThread link projection failed:', (err as Error).message)
    })
  }

  async projectThread(thread: HealthThread): Promise<void> {
    const session = this.driver.session()
    try {
      const data = thread.toJSON()
      await session.executeWrite(async (tx) => {
        await tx.run(
          `MERGE (p:Patient {id: $patientId})
           MERGE (t:HealthThread {id: $threadId})
           SET t.title = $title,
               t.kind = $kind,
               t.status = $status,
               t.summary = $summary,
               t.updatedAt = $updatedAt
           MERGE (p)-[:HAS_THREAD]->(t)`,
          {
            patientId: data.patientId,
            threadId: data.id,
            title: data.title,
            kind: data.kind,
            status: data.status,
            summary: data.summary,
            updatedAt: data.updatedAt.toISOString(),
          },
        )

        if (data.kind === 'hypothesis' || data.kind === 'investigation') {
          await tx.run(
            `MERGE (h:Hypothesis {id: $threadId})
             SET h.title = $title,
                 h.confidence = $confidence,
                 h.status = $status
             MERGE (t:HealthThread {id: $threadId})
             MERGE (t)-[:HAS_HYPOTHESIS]->(h)`,
            {
              threadId: data.id,
              title: data.title,
              confidence: data.confidence,
              status: data.status,
            },
          )
        }

        if (data.status === 'ruled_out') {
          await tx.run(
            `MATCH (t:HealthThread {id: $threadId})
             OPTIONAL MATCH (h:Hypothesis {id: $threadId})
             FOREACH (_ IN CASE WHEN h IS NOT NULL THEN [1] ELSE [] END |
               MERGE (t)-[:RULED_OUT]->(h)
             )`,
            { threadId: data.id },
          )
        }

        if (data.status === 'converted') {
          await tx.run(
            `MATCH (t:HealthThread {id: $threadId})-[l:LINKS]->(e)
             WHERE l.role = 'result' AND e.type IN ['diagnosis', 'allergy']
             MATCH (h:Hypothesis {id: $threadId})
             MERGE (h)-[:CONFIRMED_AS]->(e)`,
            { threadId: data.id },
          )
        }
      })
    } finally {
      await session.close()
    }
  }

  async projectLink(thread: HealthThread, link: HealthThreadLink): Promise<void> {
    const session = this.driver.session()
    try {
      const threadData = thread.toJSON()
      const linkData = link.toJSON()
      const label = ENTITY_LABEL[linkData.entityType] ?? 'LinkedEntity'
      const relType = this.linkRelationship(threadData.kind, linkData.role, linkData.entityType)

      await session.executeWrite(async (tx) => {
        await tx.run(
          `MERGE (t:HealthThread {id: $threadId})
           MERGE (e:${label} {id: $entityId})
           SET e.type = $entityType
           MERGE (t)-[r:LINKS]->(e)
           SET r.role = $role, r.label = $label`,
          {
            threadId: threadData.id,
            entityId: linkData.entityId,
            entityType: linkData.entityType,
            role: linkData.role,
            label: linkData.label,
          },
        )

        if (relType === 'SUPPORTS') {
          await tx.run(
            `MATCH (t:HealthThread {id: $threadId})
             MATCH (e:${label} {id: $entityId})
             MERGE (t)-[:SUPPORTS]->(e)`,
            { threadId: threadData.id, entityId: linkData.entityId },
          )
        }

        if (relType === 'CONFIRMED_AS' && linkData.entityType === 'diagnosis') {
          await tx.run(
            `MATCH (h:Hypothesis {id: $threadId})
             MATCH (d:Diagnosis {id: $entityId})
             MERGE (h)-[:CONFIRMED_AS]->(d)`,
            { threadId: threadData.id, entityId: linkData.entityId },
          )
        }
      })
    } finally {
      await session.close()
    }
  }

  private linkRelationship(
    threadKind: string,
    role: string,
    entityType: string,
  ): 'SUPPORTS' | 'CONFIRMED_AS' | 'LINKS' {
    if (entityType === 'diagnosis' && role === 'result') return 'CONFIRMED_AS'
    if (
      (threadKind === 'hypothesis' || threadKind === 'investigation') &&
      (entityType === 'exam' || entityType === 'medical_record') &&
      (role === 'result' || role === 'related' || role === 'ordered')
    ) {
      return 'SUPPORTS'
    }
    return 'LINKS'
  }
}
