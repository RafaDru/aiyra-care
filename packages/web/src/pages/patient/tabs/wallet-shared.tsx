import type { ReactNode } from 'react'
import { Typography } from 'antd'
import type { IntegrationLink } from '../../../lib/api.types.js'
import { brandOrFallback, brandLogoForVariant, type BrandKey } from '../../../components/brands/brand-config.js'
import { formatSyncNovelty } from '../../../lib/silent-sync.js'

const { Text } = Typography

export const INSURANCE_PORTALS = new Set(['unimed', 'amil', 'bradesco_saude'])
export const HOSPITAL_PORTALS = new Set(['mater_dei'])
export const LABORATORY_PORTALS = new Set(['hermes_pardini'])

export function noveltySummary(n: import('../../../lib/api.types.js').SyncNoveltySummary | null | undefined): string | null {
  return formatSyncNovelty(n)
}

export function formatCpf(cpf: string | null | undefined) {
  if (!cpf || cpf.length !== 11) return cpf || '—'
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
}

export function formatCns(cns: string | null | undefined) {
  if (!cns) return '—'
  const d = cns.replace(/\D/g, '')
  if (d.length !== 15) return cns
  return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7, 11)} ${d.slice(11)}`
}

export function formatCardNumber(value: string | null | undefined) {
  if (!value) return null
  return value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim()
}

export function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function remainingSeconds(expiresAt: string | null | undefined): number {
  if (!expiresAt) return 0
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
}

export function WalletCardFace({
  brandKey,
  planLabel,
  holderName,
  numberLabel,
  numberValue,
  extra,
  highlighted,
  id,
}: {
  brandKey: BrandKey | string
  planLabel?: string
  holderName: string
  numberLabel: string
  numberValue: string
  extra?: ReactNode
  highlighted?: boolean
  id?: string
}) {
  const meta = brandOrFallback(brandKey)
  const textColor = meta.cardTextColor ?? '#fff'
  const mutedColor = meta.cardMutedColor ?? meta.accent
  const headerBg = meta.cardHeaderBg ?? meta.logoBg ?? meta.color
  const headerLogoSrc = brandLogoForVariant(meta, 'cardHeader')
  const headerLogoMaxH = meta.cardHeaderLogoMaxHeight ?? 40

  return (
    <div
      id={id}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        background: meta.gradient,
        color: textColor,
        position: 'relative',
        boxShadow: highlighted
          ? '0 0 0 3px var(--primary, #9333EA), 0 8px 24px rgba(15,23,42,0.12)'
          : '0 8px 24px rgba(15,23,42,0.12)',
        transition: 'box-shadow 0.2s ease',
      }}
    >
      {headerLogoSrc && (
        <div
          style={{
            background: headerBg,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            minHeight: headerLogoMaxH + 28,
          }}
        >
          <img
            src={headerLogoSrc}
            alt={meta.label}
            style={{
              display: 'block',
              width: 'auto',
              height: 'auto',
              maxHeight: headerLogoMaxH,
              maxWidth: '85%',
              objectFit: 'contain',
            }}
          />
        </div>
      )}

      <div style={{ padding: '16px 18px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <Text style={{ color: mutedColor, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
              {meta.subtitle}
            </Text>
            <div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.2, marginTop: 2 }}>{meta.label}</div>
            {planLabel && planLabel !== meta.subtitle && (
              <Text style={{ color: mutedColor, fontSize: 12 }}>{planLabel}</Text>
            )}
          </div>
          {extra}
        </div>

        <div style={{ marginTop: 22 }}>
          <Text style={{ color: mutedColor, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            {numberLabel}
          </Text>
          <div
            style={{
              fontFamily: 'ui-monospace, Consolas, monospace',
              fontSize: numberValue === '—' ? 15 : 20,
              fontWeight: 600,
              letterSpacing: numberValue === '—' ? 0 : 1.5,
              marginTop: 4,
              opacity: numberValue === '—' ? 0.7 : 1,
            }}
          >
            {numberValue}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <Text style={{ color: mutedColor, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            Beneficiário
          </Text>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{holderName}</div>
        </div>
      </div>
    </div>
  )
}

export function CardToolbar({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        padding: '10px 12px',
        background: 'var(--card-bg, #fff)',
        border: '1px solid var(--border, #e5e7eb)',
        borderTop: 'none',
        borderRadius: '0 0 16px 16px',
        marginTop: -1,
      }}
    >
      {children}
    </div>
  )
}
