export type AvaChartType = 'line' | 'bar'

export interface AvaChartSeriesPoint {
  label: string
  value: number
  date?: string
}

export interface AvaChartSpec {
  type: AvaChartType
  title?: string
  series: AvaChartSeriesPoint[]
  refLow?: number
  refHigh?: number
  unit?: string
}

export function parseAvaChartSpec(raw: string): AvaChartSpec | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const parsed = JSON.parse(trimmed) as Partial<AvaChartSpec>
    if (!parsed || typeof parsed !== 'object') return null
    const type = parsed.type === 'bar' ? 'bar' : parsed.type === 'line' ? 'line' : null
    if (!type) return null
    if (!Array.isArray(parsed.series) || parsed.series.length === 0) return null
    const series: AvaChartSeriesPoint[] = []
    for (const point of parsed.series) {
      if (!point || typeof point !== 'object') continue
      const label = String((point as AvaChartSeriesPoint).label ?? '').trim()
      const value = Number((point as AvaChartSeriesPoint).value)
      if (!label || !Number.isFinite(value)) continue
      const date = (point as AvaChartSeriesPoint).date
      series.push({
        label,
        value,
        date: typeof date === 'string' && date.trim() ? date.trim() : undefined,
      })
    }
    if (series.length === 0) return null
    const spec: AvaChartSpec = { type, series }
    if (typeof parsed.title === 'string' && parsed.title.trim()) spec.title = parsed.title.trim()
    if (typeof parsed.unit === 'string' && parsed.unit.trim()) spec.unit = parsed.unit.trim()
    if (typeof parsed.refLow === 'number' && Number.isFinite(parsed.refLow)) spec.refLow = parsed.refLow
    if (typeof parsed.refHigh === 'number' && Number.isFinite(parsed.refHigh)) spec.refHigh = parsed.refHigh
    return spec
  } catch {
    return null
  }
}
