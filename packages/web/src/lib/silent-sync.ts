import type { IntegrationLink } from '../lib/api.types.js'

const SYNCABLE = new Set(['unimed', 'amil', 'mater_dei', 'hermes_pardini'])

/** Intervalo mínimo entre syncs silenciosos automáticos (ms). */
export const SILENT_SYNC_STALE_MS = Number(
  import.meta.env.VITE_SILENT_SYNC_STALE_MS ?? String(6 * 60 * 60 * 1000),
)

export function isSyncablePortal(portalType: string): boolean {
  return SYNCABLE.has(portalType)
}

/** Sessão persistida no servidor — sync silencioso só quando true. */
export function isLinkSessionReady(link: IntegrationLink): boolean {
  return link.sessionReady === true
}

export function collectSyncTargets(links: IntegrationLink[]): IntegrationLink[] {
  const seen = new Set<string>()
  const out: IntegrationLink[] = []
  for (const link of links) {
    if (!SYNCABLE.has(link.portalType)) continue
    const syncLinkId = link.effectiveSyncLinkId ?? link.id
    if (seen.has(syncLinkId)) continue
    seen.add(syncLinkId)
    out.push(link)
  }
  return out
}

/**
 * Oferece sync automático na Carteira apenas com sessão válida e dados desatualizados.
 * Primeiro login continua manual (botão Sincronizar).
 */
export function shouldOfferSilentSync(link: IntegrationLink): boolean {
  if (!isSyncablePortal(link.portalType)) return false
  if (!isLinkSessionReady(link)) return false
  const when = link.effectiveLastSyncAt ?? link.lastSyncAt
  if (!when) return true
  return Date.now() - new Date(when).getTime() > SILENT_SYNC_STALE_MS
}

export function formatSyncNovelty(n: import('../lib/api.types.js').SyncNoveltySummary | null | undefined): string | null {
  if (!n) return null
  const parts: string[] = []
  if (n.newAuthorizations != null && n.newAuthorizations > 0) {
    parts.push(`${n.newAuthorizations} autorização(ões) nova(s)`)
  }
  if (n.updatedAuthorizations != null && n.updatedAuthorizations > 0) {
    parts.push(`${n.updatedAuthorizations} autorização(ões) atualizada(s)`)
  }
  if (n.newMedicalRecords != null && n.newMedicalRecords > 0) {
    parts.push(`${n.newMedicalRecords} consulta(s) nova(s)`)
  }
  if (n.newExamRecords != null && n.newExamRecords > 0) parts.push(`${n.newExamRecords} exame(s) novo(s)`)
  if (n.filesDownloaded != null && n.filesDownloaded > 0) parts.push(`${n.filesDownloaded} arquivo(s) baixado(s)`)
  if (n.skippedAuthorizations != null && n.skippedAuthorizations > 0 && !parts.some((p) => p.includes('autorização'))) {
    parts.push(`${n.skippedAuthorizations} autorização(ões) já conhecidas`)
  }
  if (n.skippedMedicalRecords != null && n.skippedMedicalRecords > 0 && !parts.some((p) => p.includes('consulta'))) {
    parts.push(`${n.skippedMedicalRecords} consulta(s) já conhecidas`)
  }
  if (n.skippedExamRecords != null && n.skippedExamRecords > 0 && !parts.some((p) => p.includes('exame'))) {
    parts.push(`${n.skippedExamRecords} exame(s) já conhecidos`)
  }
  if (n.filesSkipped != null && n.filesSkipped > 0 && !parts.length) {
    parts.push(`${n.filesSkipped} arquivo(s) sem novidade`)
  }
  return parts.length ? parts.join(' · ') : 'Sem novidades no portal'
}
