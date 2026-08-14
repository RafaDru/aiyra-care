/** WHO child growth reference knots (0–60 months). Approximate P3/P50/P97 for UI bands — not for clinical diagnosis. */

export type WhoGender = 'male' | 'female'
export type WhoMetric = 'weight' | 'height' | 'head_circumference'

type KnotTable = {
  months: number[]
  p3: number[]
  p50: number[]
  p97: number[]
}

const KNOT_MONTHS = [0, 3, 6, 9, 12, 18, 24, 30, 36, 48, 60]

const BOYS_WEIGHT: KnotTable = {
  months: KNOT_MONTHS,
  p3: [2.5, 5.0, 6.4, 7.5, 8.4, 10.0, 11.3, 12.2, 13.2, 15.0, 17.2],
  p50: [3.3, 6.4, 7.9, 8.9, 9.6, 11.3, 12.7, 13.8, 14.9, 17.1, 19.8],
  p97: [4.4, 8.0, 9.6, 10.8, 11.3, 12.8, 14.3, 15.6, 17.0, 20.0, 23.5],
}

const GIRLS_WEIGHT: KnotTable = {
  months: KNOT_MONTHS,
  p3: [2.4, 4.6, 5.8, 6.8, 7.7, 9.2, 10.5, 11.5, 12.4, 14.2, 16.5],
  p50: [3.2, 5.8, 7.3, 8.2, 9.0, 10.6, 11.9, 13.0, 14.1, 16.1, 18.6],
  p97: [4.2, 7.5, 9.3, 10.4, 11.5, 13.2, 14.8, 16.2, 17.6, 20.2, 23.2],
}

const BOYS_HEIGHT: KnotTable = {
  months: KNOT_MONTHS,
  p3: [46.3, 57.3, 63.6, 67.7, 71.0, 76.9, 81.7, 85.1, 88.2, 93.9, 98.5],
  p50: [49.9, 61.4, 67.6, 71.8, 75.7, 81.7, 87.1, 90.7, 96.1, 103.3, 109.2],
  p97: [53.4, 65.3, 71.6, 75.9, 79.6, 85.6, 91.3, 95.2, 100.8, 108.4, 114.5],
}

const GIRLS_HEIGHT: KnotTable = {
  months: KNOT_MONTHS,
  p3: [45.6, 55.6, 61.9, 66.0, 69.8, 75.6, 80.3, 83.8, 87.2, 93.3, 98.8],
  p50: [49.1, 59.8, 65.7, 69.8, 74.0, 80.0, 85.2, 88.8, 93.9, 101.1, 107.4],
  p97: [52.7, 63.8, 70.1, 74.4, 78.5, 84.6, 90.0, 93.8, 99.2, 107.0, 113.6],
}

const BOYS_HEAD: KnotTable = {
  months: KNOT_MONTHS,
  p3: [32.4, 38.3, 41.0, 42.4, 43.6, 45.3, 46.6, 47.4, 48.2, 49.0, 49.6],
  p50: [34.5, 40.5, 43.3, 44.5, 46.1, 47.6, 48.4, 49.0, 49.5, 50.2, 50.7],
  p97: [36.5, 42.5, 45.2, 46.5, 48.0, 49.4, 50.1, 50.6, 51.0, 51.5, 51.9],
}

const GIRLS_HEAD: KnotTable = {
  months: KNOT_MONTHS,
  p3: [31.9, 37.4, 40.0, 41.3, 42.5, 44.0, 45.2, 46.0, 46.8, 47.6, 48.2],
  p50: [33.9, 39.5, 42.2, 43.5, 45.0, 46.5, 47.5, 48.2, 48.9, 49.6, 50.2],
  p97: [35.8, 41.5, 44.2, 45.5, 47.0, 48.5, 49.5, 50.2, 50.9, 51.5, 52.0],
}

const TABLES: Record<WhoGender, Record<WhoMetric, KnotTable>> = {
  male: {
    weight: BOYS_WEIGHT,
    height: BOYS_HEIGHT,
    head_circumference: BOYS_HEAD,
  },
  female: {
    weight: GIRLS_WEIGHT,
    height: GIRLS_HEIGHT,
    head_circumference: GIRLS_HEAD,
  },
}

function interpolate(months: number[], values: number[], ageMonths: number): number {
  if (ageMonths <= months[0]) return values[0]
  if (ageMonths >= months[months.length - 1]) return values[values.length - 1]
  for (let i = 0; i < months.length - 1; i++) {
    if (ageMonths >= months[i] && ageMonths <= months[i + 1]) {
      const span = months[i + 1] - months[i]
      const t = (ageMonths - months[i]) / span
      return values[i] + t * (values[i + 1] - values[i])
    }
  }
  return values[values.length - 1]
}

export function ageMonthsAt(birthDate: Date, at: Date): number {
  const ms = at.getTime() - birthDate.getTime()
  return ms / (1000 * 60 * 60 * 24 * 30.4375)
}

export function resolveWhoGender(gender: string | null | undefined): WhoGender | null {
  if (gender === 'male' || gender === 'female') return gender
  return null
}

export function metricFromTypeCode(typeCode: string): WhoMetric | null {
  if (typeCode === 'weight' || typeCode === 'height' || typeCode === 'head_circumference') return typeCode
  return null
}

export function referenceAtAge(gender: WhoGender, metric: WhoMetric, ageMonths: number) {
  const table = TABLES[gender][metric]
  const clamped = Math.max(0, Math.min(60, ageMonths))
  return {
    p3: interpolate(table.months, table.p3, clamped),
    p50: interpolate(table.months, table.p50, clamped),
    p97: interpolate(table.months, table.p97, clamped),
  }
}

export function estimatePercentile(p3: number, p50: number, p97: number, value: number): number {
  if (p50 === p3) return 50
  if (value <= p3) return Math.max(1, 3 * (value / p3))
  if (value >= p97) return Math.min(99, 97 + 3 * ((value - p97) / Math.max(p97, 1)))
  if (value <= p50) return 3 + 47 * (value - p3) / (p50 - p3)
  return 50 + 47 * (value - p50) / (p97 - p50)
}

export function buildReferenceCurve(
  gender: WhoGender,
  metric: WhoMetric,
  fromMonths = 0,
  toMonths = 60,
  step = 1,
) {
  const points: Array<{ ageMonths: number; p3: number; p50: number; p97: number }> = []
  const start = Math.max(0, Math.floor(fromMonths))
  const end = Math.min(60, Math.ceil(toMonths))
  for (let m = start; m <= end; m += step) {
    const ref = referenceAtAge(gender, metric, m)
    points.push({ ageMonths: m, ...ref })
  }
  return points
}

export function parseGlucoseMgDl(text: string): number | null {
  const normalized = text.replace(/\s+/g, ' ')
  const patterns = [
    /(\d{2,3})\s*mg\s*\/?\s*dL/i,
    /(\d{2,3})\s*mg\/dL/i,
    /glicemia[:\s]+(\d{2,3})/i,
    /glucose[:\s]+(\d{2,3})/i,
    /glicose[:\s]+(\d{2,3})/i,
  ]
  for (const re of patterns) {
    const m = normalized.match(re)
    if (m) {
      const v = Number(m[1])
      if (v >= 40 && v <= 600) return v
    }
  }
  return null
}

export function isGlucoseExamLabel(text: string): boolean {
  return /glicemia|glucose|glicose|glicada|blood\s*sugar|hba1c/i.test(text)
}
