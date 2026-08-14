export type MeasurementChartPoint = {
  observedAt: string
  value: number | null
  valueSecondary: number | null
  notes: string | null
  healthThreadId: string | null
}

export type MeasurementChartSeries = {
  typeCode: string
  labelKey: string
  category: string
  unit: string | null
  valueKind: string
  chartConfig: {
    enabled?: boolean
    chartKind?: 'line' | 'area' | 'dual-line' | 'dual-axis'
    color?: string
    components?: { code: string; color?: string }[]
  }
  normalRange: { min?: number; max?: number; criticalLow?: number; criticalHigh?: number } | null
  points: MeasurementChartPoint[]
}

export type MeasurementChartKind = NonNullable<MeasurementChartSeries['chartConfig']['chartKind']>
