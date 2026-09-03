import type {
  OpsHourlyAvaEventBucket,
  OpsHourlyAvaTokensBucket,
  OpsHourlyCountBucket,
  OpsHourlySyncBucket,
} from './ops-metrics.types.js'

function hourLabel(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function mapHourBucket<T extends { hour: Date | string }>(
  row: T,
): T & { hour: string; label: string } {
  const date = row.hour instanceof Date ? row.hour : new Date(row.hour as string)
  return {
    ...row,
    hour: date.toISOString(),
    label: hourLabel(date),
  }
}

export function buildTimeSeries24h(
  syncRows: Array<{ hour: Date | string; success: number; failed: number }>,
  avaEventRows: Array<{ hour: Date | string; completed: number; failed: number; quotaBlocked: number }>,
  clientErrorRows: Array<{ hour: Date | string; count: number }>,
  avaTokenRows: Array<{ hour: Date | string; turns: number; tokens: number }>,
): {
  syncJobs: OpsHourlySyncBucket[]
  avaEvents: OpsHourlyAvaEventBucket[]
  clientErrors: OpsHourlyCountBucket[]
  avaTokens: OpsHourlyAvaTokensBucket[]
} {
  return {
    syncJobs: syncRows.map((r) => mapHourBucket(r)),
    avaEvents: avaEventRows.map((r) => mapHourBucket(r)),
    clientErrors: clientErrorRows.map((r) => mapHourBucket(r)),
    avaTokens: avaTokenRows.map((r) => mapHourBucket(r)),
  }
}
