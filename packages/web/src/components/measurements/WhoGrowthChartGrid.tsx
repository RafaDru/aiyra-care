import { WhoGrowthChart } from './WhoGrowthChart.js'

type Props = {
  patientId: string
  birthDate?: string | null
  gender?: string | null
}

const METRICS: Array<'weight' | 'height' | 'head_circumference'> = [
  'weight',
  'height',
  'head_circumference',
]

export function WhoGrowthChartGrid({ patientId, birthDate, gender }: Props) {
  if (!birthDate || !gender || (gender !== 'male' && gender !== 'female')) return null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
      {METRICS.map((typeCode) => (
        <WhoGrowthChart key={typeCode} patientId={patientId} typeCode={typeCode} />
      ))}
    </div>
  )
}
