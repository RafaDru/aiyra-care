/** Failure Probes M3 (RN) — build-time opt-out (paridade semântica com bridge blocklist no servidor). */
const PROBE_VERSION = '0.1.0'

const FEATURE_KEY = /^[a-z][a-z0-9_:-]{0,63}$/

function parseCsv(raw: string | undefined): Set<string> {
  const out = new Set<string>()
  if (!raw?.trim()) return out
  for (const part of raw.split(',')) {
    const key = part.trim().toLowerCase()
    if (!key || key === 'none') continue
    if (FEATURE_KEY.test(key)) out.add(key)
  }
  return out
}

let cachedOptOut: Set<string> | null = null

/** Features que não devem enviar probes (ingest silencioso desligado). */
export function getFailureProbeOptOutFeatures(): Set<string> {
  if (cachedOptOut) return cachedOptOut
  const raw =
    process.env.EXPO_PUBLIC_FAILURE_PROBE_OPT_OUT
    ?? process.env.EXPO_PUBLIC_CLIENT_ERROR_INCIDENT_FEATURES_DISABLED
    ?? process.env.EXPO_PUBLIC_FAILURE_PROBE_OPT_OUT_FEATURES
  cachedOptOut = parseCsv(raw)
  return cachedOptOut
}

export function isFailureProbeOptedOut(feature: string): boolean {
  const key = feature.trim().toLowerCase()
  return getFailureProbeOptOutFeatures().has(key)
}

export function getFailureProbeVersion(): string {
  return PROBE_VERSION
}

/** Expõe parse para testes sem depender de process.env. */
export function parseFailureProbeOptOutCsv(raw: string | undefined): Set<string> {
  return parseCsv(raw)
}
