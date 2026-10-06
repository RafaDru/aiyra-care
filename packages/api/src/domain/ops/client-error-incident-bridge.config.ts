import type { AnalysisQueueLane } from './ops-analysis-queue.types.js'
import type {
  ClientErrorIncidentBridgeConfig,
  ClientErrorIncidentRule,
} from './client-error-incident-bridge.types.js'

/** Phase 0 pilot + phase 1 web patient/integrations surfaces — see CLIENT_ERROR_INCIDENT_BRIDGE.md */
const DEFAULT_FEATURES = [
  'account_settings',
  'dashboard',
  'ui',
  'patient_exams',
  'patient_integrations',
  'patient_wallet',
  'patient_detail',
  'patient_context',
  'integrations',
  'family_hub',
  'settings',
]
/** Piloto / teste: 15 min — produção pode subir via env (ex. 6h). */
const DEFAULT_DEDUPE_MS = 15 * 60 * 1000
const DEFAULT_API_PREFIXES = ['/auth', '/account', '/patients']
const DEFAULT_SRE_FEATURES = new Set<string>()

function parseCsv(raw: string | undefined, fallback: string[]): string[] {
  const text = raw?.trim()
  if (!text) return fallback
  return text.split(',').map((s) => s.trim()).filter(Boolean)
}

function parseFeatureSet(raw: string | undefined, fallback: string[]): Set<string> {
  return new Set(parseCsv(raw, fallback).map((f) => f.toLowerCase()))
}

export function resolveClientErrorIncidentBridgeConfig(
  env: NodeJS.ProcessEnv = process.env,
): ClientErrorIncidentBridgeConfig {
  const enabled = env.CLIENT_ERROR_INCIDENT_BRIDGE_ENABLED?.trim() === '1'
  const dedupeRaw = Number(env.CLIENT_ERROR_INCIDENT_DEDUPE_MS ?? String(DEFAULT_DEDUPE_MS))
  const minCountRaw = Number(env.CLIENT_ERROR_INCIDENT_MIN_COUNT ?? '1')
  const apiPathPrefixes = parseCsv(env.CLIENT_ERROR_INCIDENT_API_PREFIXES, DEFAULT_API_PREFIXES)
    .map((p) => (p.startsWith('/') ? p : `/${p}`))

  return {
    enabled,
    features: parseFeatureSet(env.CLIENT_ERROR_INCIDENT_FEATURES, DEFAULT_FEATURES),
    dedupeMs: Number.isFinite(dedupeRaw) && dedupeRaw > 0 ? dedupeRaw : DEFAULT_DEDUPE_MS,
    minCount: Number.isFinite(minCountRaw) && minCountRaw > 0 ? Math.floor(minCountRaw) : 1,
    apiPathPrefixes,
    sreFeatures: parseFeatureSet(env.CLIENT_ERROR_INCIDENT_SRE_FEATURES, []),
  }
}

export function ruleForFeature(
  config: ClientErrorIncidentBridgeConfig,
  feature: string,
): ClientErrorIncidentRule | null {
  const normalized = feature.trim().toLowerCase()
  if (!config.features.has(normalized)) return null
  const lane: AnalysisQueueLane = config.sreFeatures.has(normalized)
    ? 'sre_support'
    : 'development_support'
  return {
    feature: normalized,
    minCountWindow: config.minCount,
    windowMs: config.dedupeMs,
    lane,
  }
}

export function apiPathMatchesIncidentPrefixes(
  path: string,
  config: ClientErrorIncidentBridgeConfig,
): boolean {
  const normalized = path.split('?')[0]
  return config.apiPathPrefixes.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  )
}
