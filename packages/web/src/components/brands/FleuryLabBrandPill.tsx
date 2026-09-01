import { Tooltip } from 'antd'
import type { FleuryLabBrand } from './fleury-group-config.js'

interface Props {
  brand: FleuryLabBrand
  size?: 'sm' | 'md'
}

export function FleuryLabBrandPill({ brand, size = 'sm' }: Props) {
  const fontSize = size === 'sm' ? 11 : 12
  const padY = size === 'sm' ? 2 : 4
  const padX = size === 'sm' ? 8 : 10

  return (
    <Tooltip title={brand.label}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: `${padY}px ${padX}px`,
          borderRadius: 999,
          background: `${brand.color}14`,
          border: `1px solid ${brand.color}40`,
          color: brand.color,
          fontSize,
          fontWeight: 700,
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
        }}
      >
        {brand.shortLabel}
      </span>
    </Tooltip>
  )
}
