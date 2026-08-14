import type { MeasurementChartSeries } from './measurement-chart.types.js'
import { MeasurementChart } from './MeasurementChart.js'

type Props = {
  series: MeasurementChartSeries[]
  minColumnWidth?: number
}

export function MeasurementChartGrid({ series, minColumnWidth = 280 }: Props) {
  if (!series.length) return null
  return (
    <div style={{
      display: 'grid',
      gap: 24,
      gridTemplateColumns: `repeat(auto-fit, minmax(${minColumnWidth}px, 1fr))`,
    }}>
      {series.map((s) => (
        <MeasurementChart key={s.typeCode} series={s} />
      ))}
    </div>
  )
}
