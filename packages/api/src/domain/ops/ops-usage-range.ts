import type { OpsUsageGranularity, OpsUsagePreset } from './ops-usage.types.js'

const MAX_CUSTOM_DAYS = 90
const TZ = 'America/Sao_Paulo'

export interface ResolvedUsageRange {
  preset: OpsUsagePreset
  from: Date
  to: Date
  granularity: OpsUsageGranularity
}

function startOfDaySaoPaulo(now: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const y = parts.find((p) => p.type === 'year')?.value ?? '1970'
  const m = parts.find((p) => p.type === 'month')?.value ?? '01'
  const d = parts.find((p) => p.type === 'day')?.value ?? '01'
  const isoLocal = `${y}-${m}-${d}T00:00:00`
  const asUtcGuess = new Date(`${isoLocal}-03:00`)
  return asUtcGuess
}

export function resolveUsageRange(
  presetRaw: string | undefined,
  fromRaw?: string,
  toRaw?: string,
): ResolvedUsageRange {
  const preset = (presetRaw?.trim() || 'today') as OpsUsagePreset
  const now = new Date()

  if (preset === 'custom') {
    const from = fromRaw ? new Date(fromRaw) : new Date(now.getTime() - 7 * 86_400_000)
    const to = toRaw ? new Date(toRaw) : now
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
      throw new Error('invalid_usage_range')
    }
    const days = (to.getTime() - from.getTime()) / 86_400_000
    if (days > MAX_CUSTOM_DAYS) {
      throw new Error('usage_range_too_long')
    }
    const granularity: OpsUsageGranularity = days <= 7 ? '1h' : '1d'
    return { preset, from, to, granularity }
  }

  if (preset === 'today') {
    return {
      preset,
      from: startOfDaySaoPaulo(now),
      to: now,
      granularity: '15m',
    }
  }

  if (preset === '7d') {
    return {
      preset,
      from: new Date(now.getTime() - 7 * 86_400_000),
      to: now,
      granularity: '1h',
    }
  }

  if (preset === '30d') {
    return {
      preset,
      from: new Date(now.getTime() - 30 * 86_400_000),
      to: now,
      granularity: '1d',
    }
  }

  throw new Error('invalid_usage_preset')
}