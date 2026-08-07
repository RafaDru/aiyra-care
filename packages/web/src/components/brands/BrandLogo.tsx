import { Avatar, Tooltip } from 'antd'
import { brandOrFallback, type BrandKey } from './brand-config.js'

interface Props {
  brand: BrandKey | string
  size?: number
  variant?: 'avatar' | 'inline'
}

export function BrandLogo({ brand, size = 32, variant = 'avatar' }: Props) {
  const meta = brandOrFallback(brand)

  if (variant === 'inline') {
    return (
      <img
        src={meta.logoSrc}
        alt={meta.label}
        width={size}
        height={Math.round(size * 0.45)}
        style={{ objectFit: 'contain', display: 'block' }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }

  return (
    <Tooltip title={meta.label}>
      <Avatar
        size={size}
        src={meta.logoSrc}
        style={{
          backgroundColor: '#fff',
          border: `2px solid ${meta.color}22`,
          padding: 4,
        }}
      >
        {meta.shortLabel.slice(0, 2).toUpperCase()}
      </Avatar>
    </Tooltip>
  )
}

export function BrandTag({
  brand,
  children,
}: {
  brand: BrandKey | string
  children?: React.ReactNode
}) {
  const meta = brandOrFallback(brand)
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 8px 2px 4px',
        borderRadius: 999,
        background: `${meta.color}12`,
        border: `1px solid ${meta.color}33`,
        fontSize: 12,
        fontWeight: 600,
        color: meta.color,
      }}
    >
      <BrandLogo brand={brand} size={20} />
      {children ?? meta.shortLabel}
    </span>
  )
}
