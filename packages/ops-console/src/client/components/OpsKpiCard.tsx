import type { ReactNode } from 'react'
import { AIYRACARE_TOKENS } from '../theme/ops-theme.js'

export function OpsKpiSparkline({
  data,
  color,
}: {
  data: number[]
  color?: string
}) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${24 - (v / max) * 20}`)
    .join(' ')

  return (
    <svg className="ops-kpi-spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden>
      <polyline
        fill="none"
        stroke={color ?? AIYRACARE_TOKENS.colorPrimary}
        strokeWidth="2"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

export function OpsKpiCard({
  label,
  value,
  hint,
  alert,
  sparkline,
}: {
  label: string
  value: number | string
  hint?: string
  alert?: boolean
  sparkline?: number[]
}) {
  return (
    <div className={`ops-kpi-card${alert ? ' ops-kpi-card--alert' : ''}`}>
      <div className="ops-kpi-label">{label}</div>
      <div
        className="ops-kpi-value"
        style={{ color: alert ? AIYRACARE_TOKENS.colorError : undefined }}
      >
        {value}
      </div>
      {sparkline && sparkline.length > 1 && (
        <OpsKpiSparkline
          data={sparkline}
          color={alert ? AIYRACARE_TOKENS.colorError : AIYRACARE_TOKENS.colorPrimary}
        />
      )}
      {hint && <div className="ops-kpi-hint">{hint}</div>}
    </div>
  )
}

export function OpsKpiGrid({ children }: { children: ReactNode }) {
  return <div className="ops-kpi-grid">{children}</div>
}
