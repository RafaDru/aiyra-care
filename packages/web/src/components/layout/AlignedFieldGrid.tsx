import { Typography } from 'antd'
import { ALIGNED_COL } from './aligned-table-columns.js'

const { Text } = Typography

export interface AlignedField {
  label: string
  value: React.ReactNode
}

interface Props {
  fields: AlignedField[]
  /** Pares label+valor por linha (grid). */
  pairsPerRow?: number
  labelWidth?: number
  gap?: number
}

/**
 * Grid de campos com labels alinhados — use dentro de linhas expandidas ou cards do mesmo grupo.
 */
export function AlignedFieldGrid({
  fields,
  pairsPerRow = 2,
  labelWidth = ALIGNED_COL.fieldLabel,
  gap = 8,
}: Props) {
  if (!fields.length) return null

  const template = Array.from({ length: pairsPerRow }, () => `${labelWidth}px minmax(0, 1fr)`).join(' ')

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: template,
        columnGap: 16,
        rowGap: gap,
        alignItems: 'start',
      }}
    >
      {fields.map((f) => (
        <div key={f.label} style={{ display: 'contents' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>{f.label}</Text>
          <Text style={{ fontSize: 13 }}>{f.value}</Text>
        </div>
      ))}
    </div>
  )
}
