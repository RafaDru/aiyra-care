/** Mirrors API `getLegalPublisher()` — server uses LEGAL_ENTITY_NAME / LEGAL_CNPJ. */
export interface LegalPublisherDisplay {
  entityName: string | null
  cnpj: string | null
  complete: boolean
}

export function formatCnpj(cnpj: string | null): string {
  const digits = cnpj?.replace(/\D/g, '') ?? ''
  if (digits.length !== 14) return cnpj ?? ''
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

export function getLegalPublisherFromEnv(): LegalPublisherDisplay {
  const entityName = import.meta.env.VITE_LEGAL_ENTITY_NAME?.trim() || null
  const cnpj = import.meta.env.VITE_LEGAL_CNPJ?.replace(/\D/g, '').trim() || null
  const complete = Boolean(entityName && cnpj && cnpj.length === 14)
  return { entityName, cnpj, complete }
}

export function mergeLegalPublisher(
  fromApi: LegalPublisherDisplay | null | undefined,
  fromEnv: LegalPublisherDisplay,
): LegalPublisherDisplay {
  if (fromApi?.complete) return fromApi
  if (fromEnv.complete) return fromEnv
  return {
    entityName: fromApi?.entityName ?? fromEnv.entityName,
    cnpj: fromApi?.cnpj ?? fromEnv.cnpj,
    complete: Boolean(
      (fromApi?.entityName ?? fromEnv.entityName) &&
        ((fromApi?.cnpj ?? fromEnv.cnpj)?.replace(/\D/g, '').length === 14),
    ),
  }
}
