import type { OpsAlert } from './ops-metrics.types.js'

/** Icone nativo do balloon Windows (ToolTipIcon). */
export type OpsToastIcon = 'error' | 'warning' | 'info'

export type OpsToastKind = 'environment' | 'support' | 'farol' | 'system'

export interface OpsAlertToast {
  title: string
  body: string
  icon: OpsToastIcon
  kind: OpsToastKind
  severity: OpsAlert['severity']
  category: OpsAlert['category']
}

const CATEGORY_LABEL: Record<OpsAlert['category'], string> = {
  infra: 'Infra',
  sync: 'Sync',
  llm: 'Ava',
  product: 'Produto',
}

/** Normaliza texto para balloon tip (UTF-8 limpo, sem bullets Unicode problematicos). */
export function sanitizeOpsToastText(text: string): string {
  return text
    .replace(/\u2014/g, '-')
    .replace(/\u2013/g, '-')
    .replace(/\u2022/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function categoryLabel(category: OpsAlert['category']): string {
  return CATEGORY_LABEL[category] ?? category
}

function primaryAlert(alerts: OpsAlert[]): OpsAlert {
  return alerts.find((a) => a.severity === 'critical') ?? alerts[0]
}

export function resolveOpsToastIcon(alerts: OpsAlert[]): OpsToastIcon {
  if (alerts.length === 0) return 'info'
  const primary = primaryAlert(alerts)
  if (alerts.some((a) => a.severity === 'critical')) return 'error'
  if (primary.category === 'product') return 'info'
  if (primary.category === 'infra' && primary.id === 'infra_neo4j_down') return 'info'
  return 'warning'
}

export function buildOpsAlertToast(alerts: OpsAlert[]): OpsAlertToast {
  if (alerts.length === 0) {
    return {
      title: '[Ambiente] Alerta',
      body: '[!] Sem detalhes',
      icon: 'info',
      kind: 'environment',
      severity: 'warning',
      category: 'product',
    }
  }

  const primary = primaryAlert(alerts)
  const severity: OpsAlert['severity'] = alerts.some((a) => a.severity === 'critical')
    ? 'critical'
    : 'warning'
  const icon = resolveOpsToastIcon(alerts)
  const severityWord = severity === 'critical' ? 'CRITICO' : 'AVISO'
  const title = `[Ambiente] ${severityWord}`

  const lines = alerts.slice(0, 3).map((a) => {
    const msg = sanitizeOpsToastText(a.message)
    return `${categoryLabel(a.category)}: ${msg}`
  })
  if (alerts.length > 3) {
    lines.push(`(+${alerts.length - 3} mais)`)
  }

  return {
    title,
    body: `[!] Threshold automatico\n${lines.join('\n')}`,
    icon,
    kind: 'environment',
    severity,
    category: primary.category,
  }
}
