import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AvaChartSpec } from '../../lib/ava-chart-parser.js'

interface Props {
  spec: AvaChartSpec
}

export function AvaInlineChart({ spec }: Props) {
  const data = spec.series.map((point) => ({
    name: point.label,
    value: point.value,
    date: point.date,
  }))

  const yDomain = (() => {
    const values = spec.series.map((p) => p.value)
    const min = Math.min(...values, spec.refLow ?? values[0]!)
    const max = Math.max(...values, spec.refHigh ?? values[0]!)
    const pad = (max - min) * 0.12 || 1
    return [min - pad, max + pad]
  })()

  return (
    <div className="ava-inline-chart">
      {spec.title && <div className="ava-inline-chart__title">{spec.title}</div>}
      <ResponsiveContainer width="100%" height={220}>
        {spec.type === 'bar' ? (
          <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis domain={yDomain as [number, number]} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: number) => [
                spec.unit ? `${value} ${spec.unit}` : value,
                spec.title ?? 'Valor',
              ]}
            />
            {spec.refLow != null && spec.refHigh != null && (
              <ReferenceArea y1={spec.refLow} y2={spec.refHigh} fill="rgba(82, 196, 26, 0.12)" />
            )}
            {spec.refLow != null && (
              <ReferenceLine y={spec.refLow} stroke="#52c41a" strokeDasharray="4 4" />
            )}
            {spec.refHigh != null && (
              <ReferenceLine y={spec.refHigh} stroke="#52c41a" strokeDasharray="4 4" />
            )}
            <Bar dataKey="value" fill="#7c3aed" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis domain={yDomain as [number, number]} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: number) => [
                spec.unit ? `${value} ${spec.unit}` : value,
                spec.title ?? 'Valor',
              ]}
            />
            {spec.refLow != null && spec.refHigh != null && (
              <ReferenceArea y1={spec.refLow} y2={spec.refHigh} fill="rgba(82, 196, 26, 0.12)" />
            )}
            {spec.refLow != null && (
              <ReferenceLine y={spec.refLow} stroke="#52c41a" strokeDasharray="4 4" />
            )}
            {spec.refHigh != null && (
              <ReferenceLine y={spec.refHigh} stroke="#52c41a" strokeDasharray="4 4" />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke="#7c3aed"
              strokeWidth={2}
              dot={{ r: 4, fill: '#7c3aed' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
