/**
 * Metadados da conversão externo → modelo interno.
 * Campos específicos de domínio (ex.: catalog_slot_key para vacinas) ficam aqui
 * ou em normalization JSONB — nunca no raw_json.
 */
export interface NormalizationMeta {
  method?: string
  score?: number
  catalogSlotKey?: string
  catalogId?: string
  displayName?: string
  details?: Record<string, unknown>
}

export function normalizationFromVaccineConference(conference: {
  method: string
  score: number
  catalogSlotKey: string | null
  catalogId: string | null
  displayName: string
}): NormalizationMeta {
  return {
    method: conference.method,
    score: conference.score,
    catalogSlotKey: conference.catalogSlotKey ?? undefined,
    catalogId: conference.catalogId ?? undefined,
    displayName: conference.displayName,
  }
}
