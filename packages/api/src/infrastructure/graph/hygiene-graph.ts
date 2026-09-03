import { neo4jDriver } from '../../db/neo4j.js'
import {
  HygieneGraphProjector,
  type HygieneDuplicateCandidateInput,
  type HygieneResolveInput,
} from './hygiene-graph.projector.js'

export const hygieneGraphProjector = new HygieneGraphProjector(neo4jDriver)

export function scheduleHygieneDuplicateCandidate(input: HygieneDuplicateCandidateInput): void {
  hygieneGraphProjector.scheduleDuplicateCandidate(input)
}

export function scheduleHygieneResolve(input: HygieneResolveInput): void {
  hygieneGraphProjector.scheduleResolve(input)
}
