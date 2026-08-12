import type { Pool } from 'pg'
import type { Driver } from 'neo4j-driver'
import type { ClinicalFlow, ClinicalFlowEdge, ClinicalFlowNode } from '../../application/clinical-link/clinical-link.service.js'
import {
  PATIENT_TIMELINE_KINDS,
  type PatientContextTimelineEvent,
  type PatientContextTimelineKind,
  type PatientTimelineResponse,
} from '../../application/patient/patient-context.types.js'
import { CLINICAL_ENTITY_TYPES, type ClinicalEntityType } from '../../domain/clinical-link/clinical-entity-type.js'
import { isNeo4jReadEnabled } from './neo4j-env.js'

const ENTITY_TYPE_MAP: Record<string, string> = {
  Exam: 'exam',
  MedicalRecord: 'medical_record',
  Authorization: 'authorization',
  Medication: 'medication',
  Doctor: 'doctor',
  Procedure: 'procedure',
  HealthThread: 'health_thread',
  Diagnosis: 'diagnosis',
  Vaccine: 'vaccine',
}

const TIMELINE_KIND_SET = new Set<string>(PATIENT_TIMELINE_KINDS)

function toTimelineKind(kind: string): PatientContextTimelineKind {
  if (TIMELINE_KIND_SET.has(kind)) return kind as PatientContextTimelineKind
  if (kind === 'medical_record') return 'consultation'
  if (kind === 'health_thread') return 'thread_note'
  return 'exam'
}

function isFlowEntityType(value: string): value is ClinicalEntityType {
  return (CLINICAL_ENTITY_TYPES as readonly string[]).includes(value)
}

function nodeKey(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`
}

export class ClinicalGraphQueryService {
  constructor(private readonly driver: Driver) {}

  async getClinicalFlow(patientId: string): Promise<ClinicalFlow | null> {
    if (!isNeo4jReadEnabled()) return null

    const session = this.driver.session()
    try {
      const nodesResult = await session.run(
        `MATCH (p:Patient {id: $patientId})-[:HAS_RECORD]->(n)
         WHERE n:Exam OR n:MedicalRecord OR n:Authorization OR n:Medication OR n:Doctor OR n:Procedure
         RETURN n.id AS id, labels(n)[0] AS label, n.type AS type, n.title AS title,
                n.eventDate AS eventDate, n.source AS source`,
        { patientId },
      )

      const edgesResult = await session.run(
        `MATCH (p:Patient {id: $patientId})-[:HAS_RECORD]->(a)
         MATCH (a)-[r]->(b)
         WHERE (b:Exam OR b:MedicalRecord OR b:Authorization OR b:Medication OR b:Doctor OR b:Procedure)
           AND type(r) IN ['ORDERED','AUTHORIZED_FOR','ATTENDED_BY','INCLUDES','PRESCRIBED','RESULT_OF','RELATED']
         RETURN a.id AS fromId, labels(a)[0] AS fromLabel, b.id AS toId, labels(b)[0] AS toLabel,
                type(r) AS relType, r.linkId AS linkId, r.relationCode AS relationCode,
                r.label AS relLabel`,
        { patientId },
      )

      const nodes: ClinicalFlowNode[] = []
      const seen = new Set<string>()
      for (const row of nodesResult.records) {
        const label = row.get('label') as string
        const entityType = ENTITY_TYPE_MAP[label] ?? row.get('type') as string ?? 'exam'
        if (!isFlowEntityType(entityType)) continue
        const entityId = row.get('id') as string
        const key = nodeKey(entityType, entityId)
        if (seen.has(key)) continue
        seen.add(key)
        nodes.push({
          entityType: entityType as ClinicalFlowNode['entityType'],
          entityId,
          title: (row.get('title') as string | null) ?? entityType,
          date: (row.get('eventDate') as string | null) ?? undefined,
          subtitle: (row.get('source') as string | null) ?? undefined,
        })
      }

      const edges: ClinicalFlowEdge[] = []
      for (const row of edgesResult.records) {
        const fromLabel = row.get('fromLabel') as string
        const toLabel = row.get('toLabel') as string
        const fromEntityType = ENTITY_TYPE_MAP[fromLabel] ?? 'medical_record'
        const toEntityType = ENTITY_TYPE_MAP[toLabel] ?? 'exam'
        if (!isFlowEntityType(fromEntityType) || !isFlowEntityType(toEntityType)) continue
        const relType = row.get('relType') as string
        const linkId = (row.get('linkId') as string | null) ?? `graph:${fromEntityType}:${toEntityType}:${relType}`
        edges.push({
          id: linkId,
          relationCode: (row.get('relationCode') as string | null) ?? relType.toLowerCase(),
          relationLabel: (row.get('relLabel') as string | null) ?? relType,
          neo4jRelType: relType,
          fromEntityType: fromEntityType as ClinicalFlowEdge['fromEntityType'],
          fromEntityId: row.get('fromId') as string,
          toEntityType: toEntityType as ClinicalFlowEdge['toEntityType'],
          toEntityId: row.get('toId') as string,
          label: row.get('relLabel') as string | null,
        })
      }

      return { nodes, edges }
    } finally {
      await session.close()
    }
  }

  async getGraphTimeline(patientId: string, limit = 200): Promise<PatientTimelineResponse | null> {
    if (!isNeo4jReadEnabled()) return null

    const session = this.driver.session()
    try {
      const result = await session.run(
        `MATCH (p:Patient {id: $patientId})-[:HAS_RECORD]->(n)
         WHERE n.eventDate IS NOT NULL
           AND (n:Exam OR n:MedicalRecord OR n:Authorization OR n:Medication OR n:HealthThread)
         RETURN n.id AS id, labels(n)[0] AS label, n.type AS type, n.title AS title,
                n.eventDate AS eventDate, n.source AS source
         ORDER BY n.eventDate DESC
         LIMIT $limit`,
        { patientId, limit },
      )

      const events: PatientContextTimelineEvent[] = []
      for (const row of result.records) {
        const label = row.get('label') as string
        const entityType = ENTITY_TYPE_MAP[label] ?? row.get('type') as string ?? 'exam'
        if (!isFlowEntityType(entityType)) continue
        const kind = toTimelineKind(entityType)
        const eventDate = row.get('eventDate') as string | null
        if (!eventDate) continue
        events.push({
          date: eventDate,
          kind,
          title: (row.get('title') as string | null) ?? kind,
          subtitle: undefined,
          source: (row.get('source') as string | null) ?? 'grafo',
          entityId: row.get('id') as string,
        })
      }

      return {
        patientId,
        generatedAt: new Date().toISOString(),
        events,
        total: events.length,
      }
    } finally {
      await session.close()
    }
  }

  async getClinicalPaths(patientId: string): Promise<ClinicalFlow | null> {
    if (!isNeo4jReadEnabled()) return null

    const session = this.driver.session()
    try {
      const result = await session.run(
        `MATCH (p:Patient {id: $patientId})-[:HAS_RECORD]->(m:MedicalRecord)
         OPTIONAL MATCH (m)-[:ORDERED]->(a:Authorization)
         OPTIONAL MATCH (a)-[:INCLUDES]->(pr:Procedure)
         OPTIONAL MATCH (a)-[:ATTENDED_BY]->(d:Doctor)
         OPTIONAL MATCH (a)-[:AUTHORIZED_FOR]->(e:Exam)
         OPTIONAL MATCH (m)-[:ATTENDED_BY]->(md:Doctor)
         RETURN m, a, pr, d, e, md`,
        { patientId },
      )

      const nodes: ClinicalFlowNode[] = []
      const edges: ClinicalFlowEdge[] = []
      const seenNodes = new Set<string>()
      const seenEdges = new Set<string>()

      const addNode = (id: string | null, label: string, props: Record<string, unknown>) => {
        if (!id) return
        const entityType = ENTITY_TYPE_MAP[label] ?? (props.type as string) ?? label.toLowerCase()
        if (!isFlowEntityType(entityType)) return
        const key = nodeKey(entityType, id)
        if (seenNodes.has(key)) return
        seenNodes.add(key)
        nodes.push({
          entityType: entityType as ClinicalFlowNode['entityType'],
          entityId: id,
          title: (props.title as string | null) ?? (props.name as string | null) ?? entityType,
          date: props.eventDate as string | undefined,
          subtitle: props.source as string | undefined,
        })
      }

      const addEdge = (
        fromId: string,
        fromLabel: string,
        toId: string,
        toLabel: string,
        relType: string,
      ) => {
        const edgeKey = `${fromId}-${relType}-${toId}`
        if (seenEdges.has(edgeKey)) return
        seenEdges.add(edgeKey)
        const fromEntityType = ENTITY_TYPE_MAP[fromLabel] ?? 'medical_record'
        const toEntityType = ENTITY_TYPE_MAP[toLabel] ?? 'exam'
        edges.push({
          id: edgeKey,
          relationCode: relType.toLowerCase(),
          relationLabel: relType,
          neo4jRelType: relType,
          fromEntityType: fromEntityType as ClinicalFlowEdge['fromEntityType'],
          fromEntityId: fromId,
          toEntityType: toEntityType as ClinicalFlowEdge['toEntityType'],
          toEntityId: toId,
          label: null,
        })
      }

      for (const row of result.records) {
        const m = row.get('m')
        const a = row.get('a')
        const pr = row.get('pr')
        const d = row.get('d')
        const e = row.get('e')
        const md = row.get('md')

        if (m) {
          addNode(m.properties.id as string, 'MedicalRecord', m.properties as Record<string, unknown>)
        }
        if (a) {
          addNode(a.properties.id as string, 'Authorization', a.properties as Record<string, unknown>)
          if (m) addEdge(m.properties.id as string, 'MedicalRecord', a.properties.id as string, 'Authorization', 'ORDERED')
        }
        if (pr && a) {
          addNode(pr.properties.id as string, 'Procedure', pr.properties as Record<string, unknown>)
          addEdge(a.properties.id as string, 'Authorization', pr.properties.id as string, 'Procedure', 'INCLUDES')
        }
        if (d && a) {
          addNode(d.properties.id as string, 'Doctor', d.properties as Record<string, unknown>)
          addEdge(a.properties.id as string, 'Authorization', d.properties.id as string, 'Doctor', 'ATTENDED_BY')
        }
        if (e && a) {
          addNode(e.properties.id as string, 'Exam', e.properties as Record<string, unknown>)
          addEdge(a.properties.id as string, 'Authorization', e.properties.id as string, 'Exam', 'AUTHORIZED_FOR')
        }
        if (md && m) {
          addNode(md.properties.id as string, 'Doctor', md.properties as Record<string, unknown>)
          addEdge(m.properties.id as string, 'MedicalRecord', md.properties.id as string, 'Doctor', 'ATTENDED_BY')
        }
      }

      return { nodes, edges }
    } finally {
      await session.close()
    }
  }
}

export async function createClinicalGraphQueryService(): Promise<ClinicalGraphQueryService> {
  const { neo4jDriver } = await import('../../db/neo4j.js')
  return new ClinicalGraphQueryService(neo4jDriver)
}
