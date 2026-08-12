import type { FastifyReply } from 'fastify'
import { neo4jDriver } from '../../../db/neo4j.js'
import { ClinicalGraphQueryService } from '../../graph/clinical-graph-query.service.js'
import { patientParamsSchema } from '../patient/patient.schema.js'
import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { assertPatientAccess } from '../auth/patient-access.guard.js'
import { isNeo4jReadEnabled } from '../../graph/neo4j-env.js'

export class GraphController {
  private readonly graphQuery = new ClinicalGraphQueryService(neo4jDriver)

  async clinicalFlow(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = patientParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.id)) return

    if (!isNeo4jReadEnabled()) {
      return reply.status(503).send({ message: 'Neo4j read disabled (NEO4J_SYNC_ENABLED / NEO4J_READ_ENABLED)' })
    }

    const flow = await this.graphQuery.getClinicalFlow(parsed.data.id)
    if (!flow) return reply.status(503).send({ message: 'Neo4j unavailable' })
    return reply.send(flow)
  }

  async clinicalPaths(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = patientParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.id)) return

    if (!isNeo4jReadEnabled()) {
      return reply.status(503).send({ message: 'Neo4j read disabled' })
    }

    const flow = await this.graphQuery.getClinicalPaths(parsed.data.id)
    if (!flow) return reply.status(503).send({ message: 'Neo4j unavailable' })
    return reply.send(flow)
  }

  async graphTimeline(req: AuthenticatedRequest, reply: FastifyReply) {
    const parsed = patientParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    if (!assertPatientAccess(req, reply, parsed.data.id)) return

    if (!isNeo4jReadEnabled()) {
      return reply.status(503).send({ message: 'Neo4j read disabled' })
    }

    const limit = Number((req.query as { limit?: string }).limit ?? '200')
    const timeline = await this.graphQuery.getGraphTimeline(parsed.data.id, limit)
    if (!timeline) return reply.status(503).send({ message: 'Neo4j unavailable' })
    return reply.send(timeline)
  }
}
