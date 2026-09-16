export type OpsEnvTarget = {
  id: string
  label: string
  apiBase: string
  port?: number
  enabled: boolean
  opsKey?: string
}

const DEFAULT_TARGETS: OpsEnvTarget[] = [
  {
    id: 'dev',
    label: 'Dev',
    apiBase: 'http://127.0.0.1:3010',
    port: 3010,
    enabled: true,
  },
  {
    id: 'preview',
    label: 'Preview',
    apiBase: 'http://127.0.0.1:3020',
    port: 3020,
    enabled: true,
  },
  {
    id: 'prod',
    label: 'Prod',
    apiBase: '',
    enabled: false,
  },
]

export function parseOpsEnvTargets(): OpsEnvTarget[] {
  const raw = process.env.OPS_ENV_TARGETS?.trim()
  if (!raw) return DEFAULT_TARGETS
  try {
    const parsed = JSON.parse(raw) as OpsEnvTarget[]
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_TARGETS
    return parsed.map((t) => ({
      id: String(t.id),
      label: String(t.label ?? t.id),
      apiBase: String(t.apiBase ?? ''),
      port: typeof t.port === 'number' ? t.port : undefined,
      enabled: Boolean(t.enabled),
      opsKey: t.opsKey?.trim() || undefined,
    }))
  } catch {
    console.warn('[ops-console] OPS_ENV_TARGETS inválido — usando defaults')
    return DEFAULT_TARGETS
  }
}

export function resolveOpsEnvTarget(id: string | undefined): OpsEnvTarget | undefined {
  const targets = parseOpsEnvTargets()
  if (!id) return targets.find((t) => t.enabled) ?? targets[0]
  return targets.find((t) => t.id === id)
}

export function resolveOpsMetricsKeyForTarget(target?: OpsEnvTarget): string | undefined {
  return (
    target?.opsKey?.trim()
    || process.env.OPS_METRICS_KEY?.trim()
    || process.env.LLM_INTERNAL_OBSERVABILITY_KEY?.trim()
    || undefined
  )
}
