import { brandOrFallback, type BrandKey } from './brand-config.js'
import { BrandLogo } from './BrandLogo.js'

/** Altura padronizada do chip (Integrações + Sincronizações). */
export const INTEGRATION_CHIP_HEIGHT = 40
/** Logo interna menor, com margem no chip. */
export const INTEGRATION_CHIP_LOGO_MAX = 32

interface Props {
  brand: BrandKey | string
  label?: string
  fullWidth?: boolean
  /** Tamanho máximo da logo interna (px). Padrão: chip integrações. */
  logoMaxSize?: number
}

/** Logo no sidebar de sincronizações (~30% menor que o chip de integrações). */
export const SYNC_CHIP_LOGO_MAX = 22

export function BrandIntegrationChip({ brand, label, fullWidth = false, logoMaxSize }: Props) {
  const meta = brandOrFallback(brand)
  const text = label ?? meta.shortLabel

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 8px 4px 4px',
        borderRadius: 10,
        border: '1px solid var(--border, #e2e8f0)',
        background: 'var(--card-bg, #fff)',
        height: INTEGRATION_CHIP_HEIGHT,
        minHeight: INTEGRATION_CHIP_HEIGHT,
        width: fullWidth ? '100%' : 'auto',
        maxWidth: fullWidth ? '100%' : 220,
        boxSizing: 'border-box',
        minWidth: 0,
      }}
    >
      <BrandLogo
        brand={brand}
        variant="avatar"
        context="integrations"
        compact
        compactMax={logoMaxSize ?? INTEGRATION_CHIP_LOGO_MAX}
      />
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text, #1e293b)',
          lineHeight: 1.2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
          flex: 1,
        }}
      >
        {text}
      </span>
    </div>
  )
}
