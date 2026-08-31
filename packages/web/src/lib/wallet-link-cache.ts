const PREFIX = 'aiyracare.wallet.cache.'

export interface WalletLinkCacheEntry {
  membershipsJson?: string
  savedAt: string
}

export function saveWalletLinkCache(linkId: string, entry: Omit<WalletLinkCacheEntry, 'savedAt'>): void {
  try {
    const payload: WalletLinkCacheEntry = { ...entry, savedAt: new Date().toISOString() }
    localStorage.setItem(PREFIX + linkId, JSON.stringify(payload))
  } catch {
    // ignore quota
  }
}

export function getWalletLinkCache(linkId: string): WalletLinkCacheEntry | null {
  try {
    const raw = localStorage.getItem(PREFIX + linkId)
    if (!raw) return null
    return JSON.parse(raw) as WalletLinkCacheEntry
  } catch {
    return null
  }
}
