/** INC visto após o fechamento do DEF pai — regra CH §3. */
export function incidentFollowsDefectFixed(
  incidentSeenAt: string,
  fixedAt: string | null | undefined,
): boolean {
  if (!fixedAt) return false
  const incidentMs = Date.parse(incidentSeenAt)
  const fixedMs = Date.parse(fixedAt)
  if (Number.isNaN(incidentMs) || Number.isNaN(fixedMs)) return false
  return incidentMs > fixedMs
}

export function resolveRecurrenceParentId(input: {
  incidentSeenAt: string
  fixedByFingerprint: { id: string; fixedAt: string | null } | null
  explicitParentId?: string | null
  explicitParent: { id: string; status: string; fixedAt: string | null } | null
}): string | null {
  const { incidentSeenAt, fixedByFingerprint, explicitParentId, explicitParent } = input

  if (
    fixedByFingerprint?.fixedAt &&
    incidentFollowsDefectFixed(incidentSeenAt, fixedByFingerprint.fixedAt)
  ) {
    return fixedByFingerprint.id
  }

  if (!explicitParentId?.trim() || !explicitParent) {
    return null
  }
  if (explicitParent.status !== 'fixed') {
    return null
  }
  if (!incidentFollowsDefectFixed(incidentSeenAt, explicitParent.fixedAt)) {
    return null
  }

  return explicitParent.id
}
