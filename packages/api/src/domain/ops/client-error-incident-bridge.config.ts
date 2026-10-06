import type { AnalysisQueueLane } from './ops-analysis-queue.types.js'
import type {
  ClientErrorIncidentBridgeConfig,
  ClientErrorIncidentRule,
} from './client-error-incident-bridge.types.js'
import { resolveDeploymentTier } from './investigator-environment.js'

/** Phase 0–1 web + phase 2–4 mobile / integration_links / Ava — CLIENT_ERROR_INCIDENT_BRIDGE.md */
const DEFAULT_FEATURES = [
  'account_settings',
  'dashboard',
  'ui',
  'app',
  'patient_exams',
  'patient_integrations',
  'patient_wallet',
  'patient_detail',
  'patient_context',
  'integrations',
  'integration_links',
  'family_hub',
  'settings',
  'ava_companion',
]
/** Piloto / teste: 15 min — produção pode subir via env (ex. 6h). */
const DEFAULT_DEDUPE_MS = 15 * 60 * 1000
const DEFAULT_API_PREFIXES = ['/auth', '/account', '/patients', '/integration-links']
/** Notebook default empty; prod may set `integration_links` for SRE lane — see bridge doc phase 3. */
const DEFAULT_SRE_FEATURES: string[] = []
/** Decision 3A (Rafael 2026-10-06): telemetry on, no auto-INC for Ava companion until medical review. */
const DEFAULT_INCIDENT_BRIDGE_DISABLED = ['ava_companion']

const BRIDGE_FEATURE_ALIASES: Record<string, string> = {
  mobile_shell: 'ui',
  'api:integration_links': 'patient_integrations',
  'api:ava': 'ava_companion',
  'api:patients:ava': 'ava_companion',
}

const PATIENT_API_RESOURCE_BRIDGE: Record<string, string> = {
  exams: 'patient_exams',
  wallet: 'patient_wallet',
  integrations: 'patient_integrations',
}

function parseCsv(raw: string | undefined, fallback: string[]): string[] {
  const text = raw?.trim()
  if (!text) return fallback
  return text.split(',').map((s) => s.trim()).filter(Boolean)
}

function parseFeatureSet(raw: string | undefined, fallback: string[]): Set<string> {
  return new Set(parseCsv(raw, fallback).map((f) => f.toLowerCase()))
}

function resolveDisabledBridgeFeatures(env: NodeJS.ProcessEnv): Set<string> {
  const explicit =
    env.CLIENT_ERROR_INCIDENT_FEATURES_DISABLED ?? env.FAILURE_PROBE_OPT_OUT_FEATURES
  if (explicit === undefined) {
    return new Set(DEFAULT_INCIDENT_BRIDGE_DISABLED)
  }
  const text = explicit.trim()
  if (text === '' || text.toLowerCase() === 'none') {
    return new Set()
  }
  return new Set(parseCsv(explicit, []).map((f) => f.toLowerCase()))
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
    disabledFeatures: resolveDisabledBridgeFeatures(env),
    dedupeMs: Number.isFinite(dedupeRaw) && dedupeRaw > 0 ? dedupeRaw : DEFAULT_DEDUPE_MS,
    minCount: Number.isFinite(minCountRaw) && minCountRaw > 0 ? Math.floor(minCountRaw) : 1,
    apiPathPrefixes,
    sreFeatures: parseFeatureSet(env.CLIENT_ERROR_INCIDENT_SRE_FEATURES, DEFAULT_SRE_FEATURES),
  }
}

/**
 * Maps telemetry feature keys (web/mobile fingerprint) to bridge allowlist keys.
 */
export function resolveBridgeIngressFeature(
  feature: string,
  properties?: Record<string, unknown>,
): string {
  const normalized = feature.trim().toLowerCase()
  const alias = BRIDGE_FEATURE_ALIASES[normalized]
  if (alias) return alias

  if (normalized.startsWith('api:patients:')) {
    const resource = normalized.slice('api:patients:'.length)
    const mapped = PATIENT_API_RESOURCE_BRIDGE[resource]
    if (mapped) return mapped
    if (resource === 'ava') return 'ava_companion'
    if (resource === 'item' || resource === 'resource') return 'patient_detail'
  }

  const apiPath = typeof properties?.api_path === 'string' ? properties.api_path : undefined
  if (apiPath && (normalized.startsWith('api') || normalized === 'app' || normalized === 'ui')) {
    const base = apiPath.split('?')[0]
    if (base.includes('/integration-links')) return 'patient_integrations'
    if (/\/ava(\/|$)/.test(base)) return 'ava_companion'
  }

  return normalized
}

/** §8.4 decisão 4B — `CLIENT_ERROR_INCIDENT_SRE_FEATURES` só roteia SRE em produção. */
export function isClientErrorSreLaneTier(
  deploymentTierOrEnv?: string | NodeJS.ProcessEnv,
): boolean {
  if (typeof deploymentTierOrEnv === 'string') {
    const tier = deploymentTierOrEnv.trim().toLowerCase()
    return tier === 'production' || tier === 'prod'
  }
  return resolveDeploymentTier(deploymentTierOrEnv) === 'production'
}

function featureMappedToSreLane(
  config: ClientErrorIncidentBridgeConfig,
  normalized: string,
): boolean {
  if (config.sreFeatures.has(normalized)) return true
  if (normalized === 'patient_integrations' && config.sreFeatures.has('integration_links')) {
    return true
  }
  return false
}

export function ruleForFeature(
  config: ClientErrorIncidentBridgeConfig,
  feature: string,
  properties?: Record<string, unknown>,
  options?: { deploymentTier?: string },
): ClientErrorIncidentRule | null {
  const normalized = resolveBridgeIngressFeature(feature, properties)
  if (config.disabledFeatures.has(normalized)) return null
  if (!config.features.has(normalized)) return null
  const lane: AnalysisQueueLane =
    featureMappedToSreLane(config, normalized) &&
    isClientErrorSreLaneTier(options?.deploymentTier)
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

/** Maps unhandled API 5xx path to bridge feature key (server hook). */
export function inferServerErrorBridgeFeature(path: string): string {
  const segments = path.split('?')[0].split('/').filter(Boolean)
  const segment = segments[0] ?? 'api'
  const mapped: Record<string, string> = {
    auth: 'account_settings',
    account: 'account_settings',
    patients: 'patient_detail',
    'integration-links': 'integration_links',
  }
  if (segment === 'patients' && segments[2] === 'ava') {
    return 'ava_companion'
  }
  const raw = mapped[segment] ?? segment.replace(/[^a-z0-9_-]/g, '_').slice(0, 64)
  return raw.toLowerCase()
}
