import { useEffect, useState } from 'react'
import { Typography } from 'antd'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import type { WhoGrowthPayload } from '../../lib/api.types.js'

type Props = {
  patientId: string
  typeCode: 'weight' | 'height' | 'head_circumference'
  height?: number
}

function buildChartRows(payload: WhoGrowthPayload) {
  const rows = payload.referenceCurve.map((r) => ({
    ageMonths: r.ageMonths,
    p3: r.p3,
    p50: r.p50,
    p97: r.p97,
    value: null as number | null,
  }))
  for (const p of payload.patientPoints) {
    const near = rows.find((r) => Math.abs(r.ageMonths - p.ageMonths) < 0.3)
    if (near) {
      near.value = p.value
    } else {
      rows.push({
        ageMonths: p.ageMonths,
        p3: null as unknown as number,
        p50: null as unknown as number,
        p97: null as unknown as number,
        value: p.value,
      })
    }
  }
  return rows.sort((a, b) => a.ageMonths - b.ageMonths)
}

export function WhoGrowthChart({ patientId, typeCode, height = 240 }: Props) {
  const { t } = useTranslation()
  const [data, setData] = useState<WhoGrowthPayload | null>(null)
  const label = t(`measurement.type.${typeCode}`)

  useEffect(() => {
    api.measurements.whoGrowth({ patientId, typeCode })
      .then(setData)
      .catch(() => setData(null))
  }, [patientId, typeCode])

  if (!data) return null

  const chartRows = buildChartRows(data)

  return (
    <div style={{ height }}>
      <Typography.Text type="secondary">
        {label} ({data.unit}) — {t('measurement.whoTitle')}
      </Typography.Text>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="ageMonths"
            type="number"
            domain={[0, 'dataMax']}
            tickFormatter={(m) => `${m}m`}
            tick={{ fontSize: 10 }}
          />
          <YAxis domain={['auto', 'auto']} width={40} tick={{ fontSize: 10 }} />
          <Tooltip
            labelFormatter={(m) => t('measurement.whoAgeMonths', { months: m })}
          />
          <Legend />
          <Line
            dataKey="p97"
            name={t('measurement.whoP97')}
            stroke="#d9d9d9"
            strokeDasharray="4 4"
            dot={false}
            type="monotone"
          />
          <Line
            dataKey="p50"
            name={t('measurement.whoP50')}
            stroke="#bfbfbf"
            strokeDasharray="2 2"
            dot={false}
            type="monotone"
          />
          <Line
            dataKey="p3"
            name={t('measurement.whoP3')}
            stroke="#d9d9d9"
            strokeDasharray="4 4"
            dot={false}
            type="monotone"
          />
          <Line
            dataKey="value"
            name={label}
            stroke="#1677ff"
            dot={{ r: 4 }}
            connectNulls={false}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
      {data.patientPoints.length > 0 && (
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
          {t('measurement.whoLastPercentile', {
            value: data.patientPoints[data.patientPoints.length - 1].percentile ?? '—',
          })}
        </Typography.Text>
      )}
    </div>
  )
}
