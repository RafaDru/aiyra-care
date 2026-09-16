import { join } from 'node:path'
import { buildDevAuditBridgeReport } from '../../domain/ops/dev-audit-bridge.js'
import type { DevAuditBridgeReport } from '../../domain/ops/dev-audit-bridge.types.js'
import { loadDevAuditRecords } from '../../infrastructure/dev-audit/dev-audit-reader.js'
import type { DevAuditBridgePgRepository } from '../../infrastructure/persistence/dev-audit-bridge.pg.repository.js'

export class DevAuditBridgeService {
  constructor(
    private readonly repo: DevAuditBridgePgRepository,
    private readonly auditRoot: string,
  ) {}

  async buildReport(windowHours = 24): Promise<DevAuditBridgeReport> {
    const until = new Date()
    const since = new Date(until.getTime() - windowHours * 60 * 60 * 1000)
    const auditRecords = loadDevAuditRecords(this.auditRoot, since, until)
    const [productByName, productHourly] = await Promise.all([
      this.repo.productEventsByName(windowHours),
      this.repo.productEventsHourly(windowHours),
    ])

    return buildDevAuditBridgeReport({
      windowHours,
      deploymentTier: process.env.DEPLOYMENT_TIER?.trim() || 'integration',
      auditRecords,
      productByName,
      productHourly,
    })
  }
}

export function defaultDevAuditRoot(repoRoot: string): string {
  return join(repoRoot, 'docs/dev-audit')
}
