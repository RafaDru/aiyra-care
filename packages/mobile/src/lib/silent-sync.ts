import type { IntegrationLink, SyncNoveltySummary } from './api.types'

const SYNCABLE = new Set(['unimed', 'amil', 'mater_dei', 'hermes_pardini'])

export function isSyncablePortal(portalType: string): boolean {
  return SYNCABLE.has(portalType)
}

export function isLinkSessionReady(link: IntegrationLink): boolean {
  return link.sessionReady === true
}

export function formatSyncNovelty(n: SyncNoveltySummary | null | undefined): string | null {
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
