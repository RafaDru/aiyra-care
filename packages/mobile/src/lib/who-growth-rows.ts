import type { WhoGrowthPayload } from '@/lib/api.types'

/** Mirrors web `WhoGrowthChart.buildChartRows`. */
export function buildWhoChartRows(payload: WhoGrowthPayload) {
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
