import type { SupportReportRecord } from './support-report.types.js'

/** Aplicação exibida no board Incidentes (CH). */
export function inferSupportReportApplication(record: SupportReportRecord): string {
  const ua = record.userAgent?.toLowerCase() ?? ''
  if (ua.includes('android')) return 'Android'
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) return 'iOS'

  const client = record.diagnosticContext?.client
  if (client && typeof client === 'object' && !Array.isArray(client)) {
    const platform = String((client as Record<string, unknown>).platform ?? '').toLowerCase()
    if (platform.includes('android')) return 'Android'
    if (platform.includes('ios')) return 'iOS'
  }

  if (record.appVersion?.toLowerCase().includes('ops')) return 'Ops'
  return 'Web'
}

export const SUPPORT_INCIDENT_ORIGIN_USUARIO = 'usuario'
