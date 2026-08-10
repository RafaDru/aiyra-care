import { neo4jDriver } from '../../db/neo4j.js'
import {
  ClinicalEntityGraphProjector,
  type CanonicalEntityProjection,
} from './clinical-entity-graph.projector.js'

export const canonicalEntityGraphProjector = new ClinicalEntityGraphProjector(neo4jDriver)

export function scheduleCanonicalEntityProjection(input: CanonicalEntityProjection): void {
  canonicalEntityGraphProjector.scheduleCanonicalEntity(input)
}
