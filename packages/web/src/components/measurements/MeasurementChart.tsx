import type { MeasurementChartSeries } from './measurement-chart.types.js'
import { MeasurementChartRenderer } from './MeasurementChartRenderer.js'

type Props = {
  series: MeasurementChartSeries
  height?: number
}

/** Gráfico simples (export/legado). Prefer MeasurementChartCard / EvolutionView na UI principal. */
export function MeasurementChart({ series, height = 220 }: Props) {
  return (
    <MeasurementChartRenderer mode="single" series={series} height={height} />
  )
}
