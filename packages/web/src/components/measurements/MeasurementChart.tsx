import { Typography } from 'antd'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, ReferenceArea,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import type { MeasurementChartSeries } from './measurement-chart.types.js'

function formatLabel(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

type Props = {
  series: MeasurementChartSeries
  height?: number
}

export function MeasurementChart({ series, height = 220 }: Props) {
  const { t } = useTranslation()
  const label = t(series.labelKey)
  const chartKind = series.chartConfig.chartKind ?? 'line'

  const data = series.points.map((p) => ({
    observedAt: p.observedAt,
    label: formatLabel(p.observedAt),
    value: p.value,
    valueSecondary: p.valueSecondary,
    systolic: p.value,
    diastolic: p.valueSecondary,
  }))

  const tooltipDate = (_: unknown, payload: Array<{ payload?: { observedAt?: string } }>) =>
    payload?.[0]?.payload?.observedAt
      ? new Date(payload[0].payload.observedAt).toLocaleString('pt-BR')
      : ''

  const color = series.chartConfig.color ?? '#1677ff'
  const range = series.normalRange
  const yDomain = range?.min != null && range?.max != null
    ? [Math.min(range.min, ...data.map((d) => d.value ?? range.min)) - 0.5, Math.max(range.max, ...data.map((d) => d.value ?? range.max)) + 0.5]
    : ['auto', 'auto'] as [string | number, string | number]

  const normalBand = range?.min != null && range?.max != null ? (
    <ReferenceArea y1={range.min} y2={range.max} fill="#52c41a" fillOpacity={0.08} />
  ) : null

  if (chartKind === 'area') {
    return (
      <div style={{ height }}>
        <Typography.Text type="secondary">{label}</Typography.Text>
        <ResponsiveContainer width="100%" height="90%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            {normalBand}
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis domain={yDomain} width={36} tick={{ fontSize: 10 }} />
            <Tooltip labelFormatter={tooltipDate} />
            <Area type="monotone" dataKey="value" name={label} stroke={color} fill={color} fillOpacity={0.15} dot={{ r: 3 }} connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (chartKind === 'dual-line' && series.typeCode === 'blood_pressure') {
    const sysColor = series.chartConfig.components?.[0]?.color ?? '#cf1322'
    const diaColor = series.chartConfig.components?.[1]?.color ?? '#1677ff'
    return (
      <div style={{ height }}>
        <Typography.Text type="secondary">{label}</Typography.Text>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis domain={['auto', 'auto']} width={40} tick={{ fontSize: 10 }} />
            <Tooltip labelFormatter={tooltipDate} />
            <Legend />
            <Line type="monotone" dataKey="systolic" name={t('measurement.component.systolic')} stroke={sysColor} dot={{ r: 3 }} connectNulls />
            <Line type="monotone" dataKey="diastolic" name={t('measurement.component.diastolic')} stroke={diaColor} dot={{ r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div style={{ height }}>
      <Typography.Text type="secondary">{label}{series.unit ? ` (${series.unit})` : ''}</Typography.Text>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          {normalBand}
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis domain={yDomain} width={40} tick={{ fontSize: 10 }} />
          <Tooltip labelFormatter={tooltipDate} />
          <Line type="monotone" dataKey="value" name={label} stroke={color} dot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
