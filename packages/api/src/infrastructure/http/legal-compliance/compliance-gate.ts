/** Rotas autenticadas que não exigem aceite legal prévio (para permitir o aceite). */
export function isComplianceExemptPath(path: string): boolean {
  return path === '/compliance/status' || path === '/compliance/accept' || path === '/auth/account'
}

export function isComplianceGateEnabled(): boolean {
  const raw = process.env.COMPLIANCE_GATE_ENABLED?.trim().toLowerCase()
  if (raw === '1' || raw === 'true' || raw === 'yes') return true
  if (raw === '0' || raw === 'false' || raw === 'no') return false
  return false
}
