import type { AnalysisQueueLane } from './ops-analysis-queue.types.js'

export interface ClientErrorIncidentRule {
  feature: string
  minCountWindow: number
  windowMs: number
  lane: AnalysisQueueLane
}

export interface ClientErrorIncidentBridgeConfig {
  enabled: boolean
  features: Set<string>
  /** Bridge must not open INC for these keys (ingest / probes unchanged). */
  disabledFeatures: Set<string>
  dedupeMs: number
  minCount: number
  apiPathPrefixes: string[]
  sreFeatures: Set<string>
}
