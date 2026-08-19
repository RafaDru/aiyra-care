import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  ReferenceArea,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import type { MeasurementChartSeries } from './measurement-chart.types.js'
import { MeasurementChartTooltip } from './MeasurementChartTooltip.js'
import {
  formatChartAxisDate,
  formatChartHumanDate,
  mergeSeriesForCompare,
} from './measurement-chart.utils.js'

type CommonProps = {
  height?: number | string
  onOpenExam?: (examId: string) => void
}

type SingleProps = CommonProps & {
  mode: 'single'
  series: MeasurementChartSeries
}

type CompareProps = CommonProps & {
  mode: 'compare'
  seriesList: MeasurementChartSeries[]
}

export type MeasurementChartRendererProps = SingleProps | CompareProps

function buildSingleData(series: MeasurementChartSeries) {
  return series.points.map((p) => ({
    observedAt: p.observedAt,
    label: formatChartAxisDate(p.observedAt),
    humanLabel: formatChartHumanDate(p.observedAt),
    value: p.value,
    valueSecondary: p.valueSecondary,
    systolic: p.value,
    diastolic: p.valueSecondary,
    notes: p.notes,
    source: p.source,
    sourceRef: p.sourceRef,
  }))
}

export function MeasurementChartRenderer(props: MeasurementChartRendererProps) {
  const { t } = useTranslation()
  const height = props.height ?? 220

  if (props.mode === 'single') {
    return (
      <SingleSeriesChart
        series={props.series}
        height={height}
        onOpenExam={props.onOpenExam}
      />
    )
  }

  const list = props.seriesList
  if (list.length === 1 && list[0].typeCode === 'blood_pressure') {
    return (
      <SingleSeriesChart
        series={list[0]}
        height={height}
        onOpenExam={props.onOpenExam}
      />
    )
  }

  return (
    <CompareSeriesChart
      seriesList={list}
      height={height}
      onOpenExam={props.onOpenExam}
    />
  )
}

function SingleSeriesChart({
  series,
  height,
  onOpenExam,
}: {
  series: MeasurementChartSeries
  height: number | string
  onOpenExam?: (examId: string) => void
}) {
  const { t } = useTranslation()
  const label = t(series.labelKey)
  const chartKind = series.chartConfig.chartKind ?? 'line'
  const data = buildSingleData(series)
  const color = series.chartConfig.color ?? '#1677ff'
  const range = series.normalRange

  const yDomain =
    range?.min != null && range?.max != null
      ? (() => {
          const minR = range.min as number
          const maxR = range.max as number
          return [
            Math.min(minR, ...data.map((d) => d.value ?? minR)) - 0.5,
            Math.max(maxR, ...data.map((d) => d.value ?? maxR)) + 0.5,
          ] as [number, number]
        })()
      : (['auto', 'auto'] as [string | number, string | number])

  const normalBand =
    range?.min != null && range?.max != null ? (
      <ReferenceArea y1={range.min} y2={range.max} fill="#52c41a" fillOpacity={0.08} />
    ) : null

  const tooltip = (
    <Tooltip
      content={
        <MeasurementChartTooltip
          series={series}
          label={label}
          unit={series.unit}
          onOpenExam={onOpenExam}
          sourceLabel={t('measurement.sourceFromExam')}
          examLinkLabel={t('measurement.viewSourceExam')}
        />
      }
    />
  )

  if (chartKind === 'area') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          {normalBand}
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis domain={yDomain} width={42} tick={{ fontSize: 11 }} />
          {tooltip}
          <Area
            type="monotone"
            dataKey="value"
            name={label}
            stroke={color}
            fill={color}
            fillOpacity={0.12}
            dot={{ r: 4, strokeWidth: 2 }}
            activeDot={{ r: 6 }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  if (chartKind === 'dual-line' && series.typeCode === 'blood_pressure') {
    const sysColor = series.chartConfig.components?.[0]?.color ?? '#cf1322'
    const diaColor = series.chartConfig.components?.[1]?.color ?? '#1677ff'
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis domain={['auto', 'auto']} width={44} tick={{ fontSize: 11 }} />
          {tooltip}
          <Legend />
          <Line
            type="monotone"
            dataKey="systolic"
            name={t('measurement.component.systolic')}
            stroke={sysColor}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="diastolic"
            name={t('measurement.component.diastolic')}
            stroke={diaColor}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        {normalBand}
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis domain={yDomain} width={44} tick={{ fontSize: 11 }} />
        {tooltip}
        <Line
          type="monotone"
          dataKey="value"
          name={label}
          stroke={color}
          strokeWidth={2}
          dot={{ r: 4, strokeWidth: 2 }}
          activeDot={{ r: 6 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function CompareSeriesChart({
  seriesList,
  height,
  onOpenExam,
}: {
  seriesList: MeasurementChartSeries[]
  height: number | string
  onOpenExam?: (examId: string) => void
}) {
  const { t } = useTranslation()
  const data = mergeSeriesForCompare(seriesList)

  const units = seriesList.map((s) => s.unit ?? '')
  const useDualAxis = seriesList.length === 2 && units[0] !== units[1]

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: useDualAxis ? 48 : 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis
          yAxisId="left"
          orientation="left"
          width={44}
          tick={{ fontSize: 11 }}
          domain={['auto', 'auto']}
          label={
            useDualAxis && seriesList[0]
              ? { value: t(seriesList[0].labelKey), angle: -90, position: 'insideLeft', style: { fontSize: 10 } }
              : undefined
          }
        />
        {useDualAxis && (
          <YAxis
            yAxisId="right"
            orientation="right"
            width={44}
            tick={{ fontSize: 11 }}
            domain={['auto', 'auto']}
            label={
              seriesList[1]
                ? { value: t(seriesList[1].labelKey), angle: 90, position: 'insideRight', style: { fontSize: 10 } }
                : undefined
            }
          />
        )}
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const row = payload[0]?.payload as Record<string, unknown>
            const when = typeof row.humanLabel === 'string' ? row.humanLabel : ''
            return (
              <div className="measurement-chart-tooltip">
                <div className="measurement-chart-tooltip__when">{when}</div>
                {seriesList.map((s) => {
                  const v = row[s.typeCode]
                  if (typeof v !== 'number') return null
                  return (
                    <div key={s.typeCode} style={{ marginTop: 6 }}>
                      <span style={{ color: s.chartConfig.color ?? '#1677ff', fontWeight: 600 }}>
                        {t(s.labelKey)}:{' '}
                      </span>
                      {v}{s.unit ? ` ${s.unit}` : ''}
                    </div>
                  )
                })}
              </div>
            )
          }}
        />
        <Legend />
        {seriesList.map((s, idx) => {
          const yAxisId = useDualAxis ? (idx === 0 ? 'left' : 'right') : 'left'
          const color = s.chartConfig.color ?? '#1677ff'
          return (
            <Line
              key={s.typeCode}
              yAxisId={yAxisId}
              type="monotone"
              dataKey={s.typeCode}
              name={t(s.labelKey)}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          )
        })}
      </LineChart>
    </ResponsiveContainer>
  )
}
