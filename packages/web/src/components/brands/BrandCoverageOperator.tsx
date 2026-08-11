import { brandOrFallback, type BrandKey } from './brand-config.js'
import { BrandLogo } from './BrandLogo.js'

interface Props {
  brand: BrandKey | string
  children?: React.ReactNode
  /** `default` = 48px (Integrações); `compact` = 36px (Convênios). */
  logoSize?: 'default' | 'compact'
}

/** Operadora / portal — logo + nome, sem box (cor na linha). */
export function BrandCoverageOperator({ brand, children, logoSize = 'compact' }: Props) {
  const meta = brandOrFallback(brand)
  const label = children ?? meta.shortLabel
  const compact = logoSize === 'compact'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 10 : 12,
        minHeight: compact ? 40 : 48,
        paddingLeft: 2,
      }}
    >
      <BrandLogo
        brand={brand}
        variant="avatar"
        context="integrations"
        compact={compact}
        compactMax={compact ? 36 : undefined}
      />
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: meta.color,
          lineHeight: 1.2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}
      >
        {label}
      </span>
    </div>
  )
}
