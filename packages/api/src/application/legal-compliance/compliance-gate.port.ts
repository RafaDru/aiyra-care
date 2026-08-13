/** Port: gate de conformidade (middleware e UI consultam pendências). */
export interface ComplianceStatus {
  compliant: boolean
  requiredKinds: string[]
  pendingKinds: string[]
  acceptances: Array<{
    kind: string
    version: string
    acceptedAt: string
    documentId: string
  }>
}

export interface ComplianceGatePort {
  getStatus(accountId: string): Promise<ComplianceStatus>
  assertCompliant(accountId: string): Promise<void>
}
