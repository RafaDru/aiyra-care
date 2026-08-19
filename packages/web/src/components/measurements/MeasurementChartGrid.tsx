import type { MeasurementChartSeries } from './measurement-chart.types.js'
import { MeasurementChartCard } from './MeasurementChartCard.js'

type Props = {
  series: MeasurementChartSeries[]
  minColumnWidth?: number
}

export function MeasurementChartGrid({ series }: Props) {
  if (!series.length) return null
  return (
    <div
      style={{
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      }}
    >
      {series.map((s) => (
        <MeasurementChartCard key={s.typeCode} series={s} />
      ))}
    </div>
  )
}
