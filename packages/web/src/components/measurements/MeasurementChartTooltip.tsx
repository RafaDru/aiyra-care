import type { MeasurementChartSeries } from './measurement-chart.types.js'
import {
  formatChartHumanDate,
  formatMeasurementValue,
  examIdFromSourceRef,
} from './measurement-chart.utils.js'

type TooltipPointMeta = {
  observedAt?: string
  humanLabel?: string
  value?: number | null
  valueSecondary?: number | null
  notes?: string | null
  source?: string
  sourceRef?: string | null
}

type Props = {
  active?: boolean
  payload?: Array<{ payload?: TooltipPointMeta; name?: string; value?: number; color?: string }>
  series?: MeasurementChartSeries
  label?: string
  unit?: string | null
  onOpenExam?: (examId: string) => void
  sourceLabel?: string
  examLinkLabel?: string
}

export function MeasurementChartTooltip({
  active,
  payload,
  series,
  label,
  unit,
  onOpenExam,
  sourceLabel,
  examLinkLabel,
}: Props) {
  if (!active || !payload?.length) return null

  const row = payload[0]?.payload
  const when = row?.humanLabel ?? (row?.observedAt ? formatChartHumanDate(row.observedAt) : '')
  const primary = row?.value ?? payload[0]?.value
  const secondary = row?.valueSecondary

  let display = formatMeasurementValue(
    typeof primary === 'number' ? primary : null,
    unit ?? series?.unit ?? null,
  )
  if (series?.typeCode === 'blood_pressure' && typeof primary === 'number') {
    display = `${primary}/${secondary ?? '—'} ${unit ?? 'mmHg'}`
  }

  const examId = examIdFromSourceRef(row?.sourceRef ?? null)
  const source =
    row?.source === 'import'
      ? sourceLabel ?? 'Importado de exame'
      : row?.source === 'manual'
        ? 'Registro manual'
        : row?.source ?? null

  return (
    <div className="measurement-chart-tooltip">
      <div className="measurement-chart-tooltip__when">{when}</div>
      <div className="measurement-chart-tooltip__value">{display}</div>
      {label && <div style={{ fontSize: 12, marginTop: 4 }}>{label}</div>}
      {row?.notes && (
        <div className="measurement-chart-tooltip__source" style={{ marginTop: 6 }}>
          {row.notes.slice(0, 120)}
        </div>
      )}
      {source && <div className="measurement-chart-tooltip__source">{source}</div>}
      {examId && onOpenExam && (
        <div
          className="measurement-chart-tooltip__link"
          onClick={(e) => {
            e.stopPropagation()
            onOpenExam(examId)
          }}
        >
          {examLinkLabel ?? 'Ver exame de origem'}
        </div>
      )}
    </div>
  )
}
