import type { MeasurementChartSeries } from './measurement-chart.types.js'

export function formatChartHumanDate(iso: string, locale = 'pt-BR'): string {
  const d = new Date(iso)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000)
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })

  if (d >= startOfToday) return `Hoje ${time}`
  if (d >= startOfYesterday) return `Ontem ${time}`

  const days = Math.floor((startOfToday.getTime() - d.getTime()) / 86400000)
  if (days < 7) {
    const weekday = d.toLocaleDateString(locale, { weekday: 'short' })
    return `${weekday} ${time}`
  }

  return d.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatChartAxisDate(iso: string, locale = 'pt-BR'): string {
  const d = new Date(iso)
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short' })
}

export function formatMeasurementValue(
  value: number | null,
  unit: string | null,
  locale = 'pt-BR',
): string {
  if (value == null) return '—'
  const formatted = Number.isInteger(value)
    ? String(value)
    : value.toLocaleString(locale, { maximumFractionDigits: 2 })
  return unit ? `${formatted} ${unit}` : formatted
}

export type TrendDirection = 'up' | 'down' | 'flat' | 'none'

export function computeSeriesTrend(series: MeasurementChartSeries): {
  direction: TrendDirection
  delta: number | null
  last: number | null
  previous: number | null
} {
  const values = series.points
    .map((p) => p.value)
    .filter((v): v is number => v != null)
  if (values.length < 2) {
    return {
      direction: values.length ? 'none' : 'none',
      delta: null,
      last: values[0] ?? null,
      previous: null,
    }
  }
  const last = values[values.length - 1]
  const previous = values[values.length - 2]
  const delta = last - previous
  const direction: TrendDirection =
    Math.abs(delta) < 0.05 ? 'flat' : delta > 0 ? 'up' : 'down'
  return { direction, delta, last, previous }
}

export function mergeSeriesForCompare(seriesList: MeasurementChartSeries[]): Array<Record<string, unknown>> {
  const timeSet = new Set<number>()
  for (const s of seriesList) {
    for (const p of s.points) {
      timeSet.add(new Date(p.observedAt).getTime())
    }
  }
  const times = [...timeSet].sort((a, b) => a - b)
  return times.map((t) => {
    const row: Record<string, unknown> = {
      observedAt: new Date(t).toISOString(),
      label: formatChartAxisDate(new Date(t).toISOString()),
      humanLabel: formatChartHumanDate(new Date(t).toISOString()),
    }
    for (const s of seriesList) {
      const point = s.points.find((p) => new Date(p.observedAt).getTime() === t)
      row[s.typeCode] = point?.value ?? null
      row[`${s.typeCode}__secondary`] = point?.valueSecondary ?? null
      row[`${s.typeCode}__meta`] = point ?? null
    }
    return row
  })
}

export function examIdFromSourceRef(sourceRef: string | null | undefined): string | null {
  if (!sourceRef?.startsWith('exam:')) return null
  return sourceRef.slice(5)
}
