import type { IntegrationLink } from '../lib/api.types.js'
import { brandForPortal } from '../components/brands/brand-config.js'
import { SILENT_SYNC_STALE_MS, isLinkSessionReady, isSyncablePortal } from './silent-sync.js'
import type { WalletLinkSyncMeta } from '../hooks/useWalletLinkSyncStatus.js'

export type WalletSyncBannerKind = 'failed' | 'stale' | 'no_session'

export interface WalletSyncBannerItem {
  kind: WalletSyncBannerKind
  portalType: string
  portalLabel: string
  detail?: string
}

const PORTAL_LABELS: Record<string, string> = {
  unimed: 'Unimed',
  amil: 'Amil',
  mater_dei: 'Mater Dei',
  hermes_pardini: 'Grupo Fleury',
}

function portalLabel(portalType: string): string {
  return brandForPortal(portalType)?.shortLabel ?? PORTAL_LABELS[portalType] ?? portalType
}

/** Dados do portal acima do intervalo de refresh silencioso (Carteira). */
export function isWalletLinkDataStale(link: IntegrationLink): boolean {
  const when = link.effectiveLastSyncAt ?? link.lastSyncAt
  if (!when) return true
  return Date.now() - new Date(when).getTime() > SILENT_SYNC_STALE_MS
}

export function buildWalletSyncBanners(
  links: IntegrationLink[],
  syncMeta: Record<string, WalletLinkSyncMeta>,
): WalletSyncBannerItem[] {
  const items: WalletSyncBannerItem[] = []
  for (const link of links) {
    if (!isSyncablePortal(link.portalType)) continue
    const label = portalLabel(link.portalType)
    const meta = syncMeta[link.id]
    if (meta?.message && !meta.active) {
      items.push({
        kind: 'failed',
        portalType: link.portalType,
        portalLabel: label,
        detail: meta.message,
      })
      continue
    }
    if (!isLinkSessionReady(link)) {
      items.push({
        kind: 'no_session',
        portalType: link.portalType,
        portalLabel: label,
      })
      continue
    }
    if (isWalletLinkDataStale(link) && !meta?.active) {
      items.push({
        kind: 'stale',
        portalType: link.portalType,
        portalLabel: label,
        detail: meta?.lastSyncLabel ?? undefined,
      })
    }
  }
  return items
}

type WalletBannerT = (key: string, opts?: { names?: string }) => string

export function walletSyncBannerMessage(
  t: WalletBannerT,
  items: WalletSyncBannerItem[],
): string | null {
  if (!items.length) return null
  const failed = items.filter((i) => i.kind === 'failed')
  const stale = items.filter((i) => i.kind === 'stale')
  const noSession = items.filter((i) => i.kind === 'no_session')
  if (failed.length) {
    const names = failed.map((i) => i.portalLabel).join(', ')
    return t('walletSyncBanner.failed', { names })
  }
  if (stale.length) {
    const names = stale.map((i) => i.portalLabel).join(', ')
    return t('walletSyncBanner.stale', { names })
  }
  if (noSession.length) {
    const names = noSession.map((i) => i.portalLabel).join(', ')
    return t('walletSyncBanner.noSession', { names })
  }
  return null
}
