import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import type { OpsProbeSnapshot } from '../../domain/ops/ops-metrics.types.js'

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
export const OPS_PROBE_ARTIFACT_PATH = resolve(apiRoot, 'scripts/output/ops-probe-last.json')
export const OPS_METRICS_ARTIFACT_PATH = resolve(apiRoot, 'scripts/output/ops-metrics-last.json')

export function readOpsProbeArtifact(): OpsProbeSnapshot | null {
  if (!existsSync(OPS_PROBE_ARTIFACT_PATH)) return null
  try {
    return JSON.parse(readFileSync(OPS_PROBE_ARTIFACT_PATH, 'utf8')) as OpsProbeSnapshot
  } catch {
    return null
  }
}

export function writeOpsProbeArtifact(snapshot: OpsProbeSnapshot): string {
  mkdirSync(dirname(OPS_PROBE_ARTIFACT_PATH), { recursive: true })
  writeFileSync(OPS_PROBE_ARTIFACT_PATH, JSON.stringify(snapshot, null, 2), 'utf8')
  return OPS_PROBE_ARTIFACT_PATH
}

export function writeOpsMetricsArtifact(payload: Record<string, unknown>): string {
  mkdirSync(dirname(OPS_METRICS_ARTIFACT_PATH), { recursive: true })
  writeFileSync(OPS_METRICS_ARTIFACT_PATH, JSON.stringify(payload, null, 2), 'utf8')
  return OPS_METRICS_ARTIFACT_PATH
}
