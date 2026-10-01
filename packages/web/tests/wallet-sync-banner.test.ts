import { describe, it, expect } from 'vitest'
import type { IntegrationLink } from '../src/lib/api.types.ts'
import {
  buildWalletSyncBanners,
  filterWalletSyncBannersForActiveSync,
  isWalletLinkDataStale,
  walletSyncBannerMessage,
  walletSyncBannerNeedsIntegrationsCta,
} from '../src/lib/wallet-sync-banner.ts'

const t = (key: string, opts?: { names?: string }) => {
  const names = opts?.names ?? ''
  const map: Record<string, string> = {
    'walletSyncBanner.failed': `failed:${names}`,
    'walletSyncBanner.stale': `stale:${names}`,
    'walletSyncBanner.noSession': `noSession:${names}`,
  }
  return map[key] ?? key
}

function link(partial: Partial<IntegrationLink> & Pick<IntegrationLink, 'id' | 'portalType'>): IntegrationLink {
  return {
    active: true,
    cardNumber: null,
    lastSyncAt: null,
    effectiveLastSyncAt: null,
    sessionReady: false,
    syncDegraded: false,
    ...partial,
  } as IntegrationLink
}

describe('isWalletLinkDataStale', () => {
  it('treats missing last sync as stale', () => {
    expect(isWalletLinkDataStale(link({ id: '1', portalType: 'unimed' }))).toBe(true)
  })

  it('treats recent sync as fresh', () => {
    const recent = new Date(Date.now() - 60_000).toISOString()
    expect(
      isWalletLinkDataStale(link({ id: '1', portalType: 'unimed', lastSyncAt: recent })),
    ).toBe(false)
  })
})

describe('buildWalletSyncBanners', () => {
  it('prioritizes failed over stale', () => {
    const links = [link({ id: '1', portalType: 'unimed', sessionReady: true, lastSyncAt: '2000-01-01T00:00:00.000Z' })]
    const items = buildWalletSyncBanners(links, {
      '1': { active: false, message: 'erro portal', noveltyText: null, lastSyncLabel: null },
    })
    expect(items).toHaveLength(1)
    expect(items[0].kind).toBe('failed')
  })

  it('shows no_session when session not ready', () => {
    const links = [link({ id: '1', portalType: 'amil', sessionReady: false })]
    const items = buildWalletSyncBanners(links, {})
    expect(items[0]?.kind).toBe('no_session')
  })

  it('shows stale when session ready and old sync', () => {
    const links = [
      link({
        id: '1',
        portalType: 'unimed',
        sessionReady: true,
        lastSyncAt: '2000-01-01T00:00:00.000Z',
      }),
    ]
    const items = buildWalletSyncBanners(links, {})
    expect(items[0]?.kind).toBe('stale')
  })
})

describe('walletSyncBannerMessage', () => {
  it('returns null for empty list', () => {
    expect(walletSyncBannerMessage(t, [])).toBeNull()
  })

  it('maps stale items to i18n key', () => {
    const msg = walletSyncBannerMessage(t, [
      { kind: 'stale', portalType: 'unimed', portalLabel: 'Unimed' },
    ])
    expect(msg).toBe('stale:Unimed')
  })
})

describe('walletSyncBannerNeedsIntegrationsCta', () => {
  it('is true for failed and no_session', () => {
    expect(
      walletSyncBannerNeedsIntegrationsCta([
        { kind: 'failed', portalType: 'unimed', portalLabel: 'Unimed' },
      ]),
    ).toBe(true)
    expect(
      walletSyncBannerNeedsIntegrationsCta([
        { kind: 'no_session', portalType: 'amil', portalLabel: 'Amil' },
      ]),
    ).toBe(true)
    expect(
      walletSyncBannerNeedsIntegrationsCta([
        { kind: 'stale', portalType: 'unimed', portalLabel: 'Unimed' },
      ]),
    ).toBe(false)
  })
})

describe('filterWalletSyncBannersForActiveSync', () => {
  it('drops stale items while sync active', () => {
    const items = [
      { kind: 'stale' as const, portalType: 'unimed', portalLabel: 'Unimed' },
      { kind: 'no_session' as const, portalType: 'amil', portalLabel: 'Amil' },
    ]
    const filtered = filterWalletSyncBannersForActiveSync(items, true)
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.kind).toBe('no_session')
  })
})
