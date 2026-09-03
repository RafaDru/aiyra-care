import type { Driver } from 'neo4j-driver'
import type { HygieneResolveDecision } from '../../domain/hygiene/hygiene.types.js'
import { isNeo4jSyncEnabled } from './health-thread-graph.projector.js'

const ENTITY_LABEL: Record<string, string> = {
  exam: 'Exam',
  vaccine: 'Vaccine',
}

export interface HygieneDuplicateCandidateInput {
  patientId: string
  entityType: 'exam' | 'vaccine'
  entityIdA: string
  entityIdB: string
  candidateId: string
  score: number
  detector: string
}

export interface HygieneResolveInput {
  patientId: string
  entityType: 'exam' | 'vaccine'
  entityIdA: string
  entityIdB: string
  candidateId: string
  decision: HygieneResolveDecision
  canonicalId?: string
  duplicateId?: string
}

export class HygieneGraphProjector {
  constructor(private readonly driver: Driver) {}

  scheduleDuplicateCandidate(input: HygieneDuplicateCandidateInput): void {
    if (!isNeo4jSyncEnabled()) return
    void this.projectDuplicateCandidate(input).catch((err) => {
      console.warn('[neo4j] Hygiene DUPLICATE_CANDIDATE failed:', (err as Error).message)
    })
  }

  scheduleResolve(input: HygieneResolveInput): void {
    if (!isNeo4jSyncEnabled()) return
    void this.projectResolve(input).catch((err) => {
      console.warn('[neo4j] Hygiene resolve projection failed:', (err as Error).message)
    })
  }

  async projectDuplicateCandidate(input: HygieneDuplicateCandidateInput): Promise<void> {
    const label = ENTITY_LABEL[input.entityType]
    if (!label) return
    const [fromId, toId] = input.entityIdA < input.entityIdB
      ? [input.entityIdA, input.entityIdB]
      : [input.entityIdB, input.entityIdA]

    const session = this.driver.session()
    try {
      await session.executeWrite(async (tx) => {
        await tx.run(`MERGE (p:Patient {id: $patientId})`, { patientId: input.patientId })
        for (const entityId of [fromId, toId]) {
          await tx.run(
            `MERGE (e:${label} {id: $entityId})
             SET e.type = $entityType, e.patientId = $patientId`,
            { entityId, entityType: input.entityType, patientId: input.patientId },
          )
          await tx.run(
            `MATCH (p:Patient {id: $patientId}), (e:${label} {id: $entityId})
             MERGE (p)-[:HAS_RECORD]->(e)`,
            { patientId: input.patientId, entityId },
          )
        }
        await tx.run(
          `MATCH (a:${label} {id: $fromId}), (b:${label} {id: $toId})
           MERGE (a)-[r:DUPLICATE_CANDIDATE]->(b)
           SET r.candidateId = $candidateId,
               r.score = $score,
               r.detector = $detector,
               r.patientId = $patientId`,
          {
            fromId,
            toId,
            candidateId: input.candidateId,
            score: input.score,
            detector: input.detector,
            patientId: input.patientId,
          },
        )
      })
    } finally {
      await session.close()
    }
  }

  async projectResolve(input: HygieneResolveInput): Promise<void> {
    const label = ENTITY_LABEL[input.entityType]
    if (!label) return
    const [fromId, toId] = input.entityIdA < input.entityIdB
      ? [input.entityIdA, input.entityIdB]
      : [input.entityIdB, input.entityIdA]

    const session = this.driver.session()
    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `MATCH (a:${label} {id: $fromId})-[r:DUPLICATE_CANDIDATE]->(b:${label} {id: $toId})
           DELETE r`,
          { fromId, toId },
        )
        if (input.decision === 'same_entity' && input.canonicalId && input.duplicateId) {
          await tx.run(
            `MATCH (dup:${label} {id: $duplicateId}), (canon:${label} {id: $canonicalId})
             MERGE (dup)-[r:CANONICAL_SAME_AS]->(canon)
             SET r.candidateId = $candidateId, r.resolvedAt = datetime()`,
            {
              duplicateId: input.duplicateId,
              canonicalId: input.canonicalId,
              candidateId: input.candidateId,
            },
          )
        }
      })
    } finally {
      await session.close()
    }
  }
}
