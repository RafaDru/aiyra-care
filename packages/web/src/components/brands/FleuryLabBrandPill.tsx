import { Tooltip } from 'antd'
import type { FleuryLabBrand } from './fleury-group-config.js'

interface Props {
  brand: FleuryLabBrand
  size?: 'sm' | 'md'
}

export function FleuryLabBrandPill({ brand, size = 'sm' }: Props) {
  const fontSize = size === 'sm' ? 11 : 12
  const padY = size === 'sm' ? 3 : 5
  const padX = size === 'sm' ? 8 : 10
  const logoH = size === 'sm' ? 18 : 22

  return (
    <Tooltip title={brand.label}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: `${padY}px ${padX}px`,
          borderRadius: 999,
          background: `${brand.color}10`,
          border: `1px solid ${brand.color}35`,
          color: brand.color,
          fontSize,
          fontWeight: 700,
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: logoH,
            minWidth: logoH,
            padding: '0 2px',
            borderRadius: 4,
            background: brand.logoBg ?? '#fff',
            flexShrink: 0,
          }}
        >
          <img
            src={brand.logoSrc}
            alt={brand.label}
            style={{
              display: 'block',
              maxHeight: logoH,
              maxWidth: size === 'sm' ? 56 : 72,
              width: 'auto',
              objectFit: 'contain',
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </span>
        {brand.shortLabel}
      </span>
    </Tooltip>
  )
}
