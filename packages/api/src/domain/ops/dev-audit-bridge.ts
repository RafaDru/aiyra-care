import type {
  DevAuditAreaCount,
  DevAuditBridgeHourlyRow,
  DevAuditBridgeReport,
  DevAuditKind,
  DevAuditRecord,
} from './dev-audit-bridge.types.js'

const ALIGNMENT_MIN_AUDIT = 3
const ALIGNMENT_MIN_PRODUCT = 2

export function classifyDevAuditArea(path: string | null | undefined): string {
  if (!path) return 'unknown'
  const p = path.replace(/\\/g, '/').toLowerCase()
  if (p.includes('packages/api')) return 'api'
  if (p.includes('packages/web')) return 'web'
  if (p.includes('packages/ops-console')) return 'ops_console'
  if (p.includes('packages/connect')) return 'connect'
  if (p.includes('database/relational')) return 'database'
  if (p.startsWith('docs/')) return 'docs'
  if (p.includes('.cursor/')) return 'cursor'
  if (p.includes('scripts/')) return 'scripts'
  return 'other'
}

export function hourBucket(isoTs: string): string {
  const d = new Date(isoTs)
  if (Number.isNaN(d.getTime())) return 'invalid'
  d.setUTCMinutes(0, 0, 0)
  return d.toISOString()
}

export function summarizeDevAudit(records: DevAuditRecord[]): DevAuditBridgeReport['audit'] {
  const byKind: Record<DevAuditKind, number> = {
    sessions: 0,
    edits: 0,
    shell: 0,
    tools: 0,
  }
  const byEvent: Record<string, number> = {}
  const areaCounts = new Map<string, number>()
  const pathCounts = new Map<string, number>()
  let blockedOrErrors = 0
  let sessions = 0

  for (const r of records) {
    byKind[r.kind] += 1
    const ev = r.event ?? 'unknown'
    byEvent[ev] = (byEvent[ev] ?? 0) + 1
    if (r.kind === 'sessions' || ev === 'sessionStart') sessions += 1
    if (ev.includes('Error') || ev === 'blocked') blockedOrErrors += 1

    const path = r.path ?? r.filePath
    if (path) {
      const area = classifyDevAuditArea(path)
      areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1)
      pathCounts.set(path, (pathCounts.get(path) ?? 0) + 1)
    }
  }

  const editsByArea: DevAuditAreaCount[] = [...areaCounts.entries()]
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count)

  const topEditedPaths = [...pathCounts.entries()]
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  return {
    totalEvents: records.length,
    byKind,
    byEvent,
    editsByArea,
    topEditedPaths,
    sessions,
    blockedOrErrors,
  }
}

export function buildHourlyCorrelation(
  auditRecords: DevAuditRecord[],
  productHourly: Array<{ hour: string; count: number }>,
): DevAuditBridgeReport['correlation'] {
  const auditByHour = new Map<string, number>()
  for (const r of auditRecords) {
    const h = hourBucket(r.ts)
    auditByHour.set(h, (auditByHour.get(h) ?? 0) + 1)
  }

  const hours = new Set<string>([
    ...auditByHour.keys(),
    ...productHourly.map((p) => p.hour),
  ])

  const hourly: DevAuditBridgeHourlyRow[] = [...hours]
    .filter((h) => h !== 'invalid')
    .sort()
    .map((hour) => {
      const auditEvents = auditByHour.get(hour) ?? 0
      const productEvents = productHourly.find((p) => p.hour === hour)?.count ?? 0
      const aligned = auditEvents >= ALIGNMENT_MIN_AUDIT && productEvents >= ALIGNMENT_MIN_PRODUCT
      return { hour, auditEvents, productEvents, aligned }
    })

  let peakAuditHour: string | null = null
  let peakAudit = 0
  let peakProductHour: string | null = null
  let peakProduct = 0
  let alignedHours = 0

  for (const row of hourly) {
    if (row.aligned) alignedHours += 1
    if (row.auditEvents > peakAudit) {
      peakAudit = row.auditEvents
      peakAuditHour = row.hour
    }
    if (row.productEvents > peakProduct) {
      peakProduct = row.productEvents
      peakProductHour = row.hour
    }
  }

  return { hourly, peakAuditHour, peakProductHour, alignedHours }
}

export function buildDevAuditBridgeHints(
  audit: DevAuditBridgeReport['audit'],
  productTotal: number,
  correlation: DevAuditBridgeReport['correlation'],
): string[] {
  const hints: string[] = []

  if (audit.totalEvents === 0) {
    hints.push('Nenhum evento dev-audit no período — hooks Cursor ativos?')
  }
  if (productTotal === 0) {
    hints.push('Nenhum product_event no PG — validar preview/staging ou uso do app.')
  }
  if (correlation.alignedHours > 0) {
    hints.push(
      `${correlation.alignedHours}h com atividade agente + uso do app (possível correlação dev→teste).`,
    )
  } else if (audit.totalEvents > 0 && productTotal > 0) {
    hints.push('Atividade dev e produto no período, mas sem horas alinhadas — janelas distintas.')
  }
  if (audit.blockedOrErrors > 0) {
    hints.push(`${audit.blockedOrErrors} eventos bloqueados/erro nos hooks — revisar tools/shell.`)
  }
  const topArea = audit.editsByArea[0]
  if (topArea) {
    hints.push(`Área mais editada: ${topArea.area} (${topArea.count} paths).`)
  }

  return hints
}

export function buildDevAuditBridgeReport(args: {
  windowHours: number
  deploymentTier: string
  auditRecords: DevAuditRecord[]
  productByName: Record<string, number>
  productHourly: Array<{ hour: string; count: number }>
}): DevAuditBridgeReport {
  const audit = summarizeDevAudit(args.auditRecords)
  const productTotal = Object.values(args.productByName).reduce((a, b) => a + b, 0)
  const correlation = buildHourlyCorrelation(args.auditRecords, args.productHourly)
  const hints = buildDevAuditBridgeHints(audit, productTotal, correlation)

  return {
    generatedAt: new Date().toISOString(),
    windowHours: args.windowHours,
    deploymentTier: args.deploymentTier,
    audit,
    productEvents: {
      total: productTotal,
      byName: args.productByName,
      hourly: args.productHourly,
    },
    correlation,
    hints,
  }
}

export function parseDevAuditJsonlLine(line: string, kind: DevAuditKind): DevAuditRecord | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  try {
    const row = JSON.parse(trimmed) as Record<string, unknown>
    return {
      ts: String(row.ts ?? ''),
      event: row.event != null ? String(row.event) : undefined,
      kind,
      tool: row.tool != null ? String(row.tool) : null,
      path: row.path != null ? String(row.path) : null,
      filePath: row.filePath != null ? String(row.filePath) : null,
      command: row.command != null ? String(row.command) : null,
      error: row.error != null ? String(row.error) : null,
    }
  } catch {
    return null
  }
}
