import { Typography } from 'antd'
import { FleuryLabBrandPill } from './FleuryLabBrandPill.js'
import { FleuryGroupSeal } from './FleuryGroupSeal.js'
import {
  fleuryLaboratoryDetail,
  isFleuryPrecisionSource,
  resolveFleuryLabBrand,
} from '../../lib/fleury-laboratory.js'

const { Text } = Typography

interface Props {
  source?: string | null
  laboratory?: string | null
  notes?: string | null
  showGroupSeal?: boolean
}

export function FleuryLaboratoryCell({
  source,
  laboratory,
  notes,
  showGroupSeal = true,
}: Props) {
  if (!laboratory && !isFleuryPrecisionSource(source)) {
    return <Text type="secondary">—</Text>
  }

  if (!isFleuryPrecisionSource(source)) {
    return <span>{laboratory ?? '—'}</span>
  }

  const brand = resolveFleuryLabBrand(source, laboratory, notes)
  const detail = fleuryLaboratoryDetail(laboratory, brand)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        {brand ? <FleuryLabBrandPill brand={brand} size="sm" /> : (
          <Text style={{ fontSize: 12, fontWeight: 600 }}>{laboratory ?? 'Precision Care'}</Text>
        )}
        {showGroupSeal && <FleuryGroupSeal size="sm" />}
      </div>
      {detail && (
        <Text type="secondary" style={{ fontSize: 11, lineHeight: 1.3 }}>
          {detail}
        </Text>
      )}
    </div>
  )
}
