import type { PatientContextService } from '../patient/patient-context.service.js'
import type { RuntimeDegradedPgRepository } from '../../infrastructure/persistence/runtime-degraded.pg.repository.js'

export class DegradedReadSnapshotService {
  constructor(
    private readonly repo: RuntimeDegradedPgRepository,
    private readonly contextService: PatientContextService,
  ) {}

  async buildAndStoreForPatient(patientId: string, asOf: string): Promise<void> {
    const context = await this.contextService.build(patientId, { timelineMonths: 6 })
    const payload = {
      patientId: context.patientId,
      generatedAt: context.generatedAt,
      identity: context.identity,
      alerts: context.alerts,
      timeline: context.timeline.slice(0, 40),
      pendencies: context.pendencies?.slice(0, 20) ?? [],
    }
    await this.repo.upsertDegradedReadSnapshot(patientId, asOf, payload)
  }

  async runNightlyBatch(asOf?: string): Promise<{ patients: number; errors: number }> {
    const date = asOf ?? new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const patientIds = await this.repo.listPatientIdsForSnapshot()
    let errors = 0
    for (const patientId of patientIds) {
      try {
        await this.buildAndStoreForPatient(patientId, date)
      } catch {
        errors += 1
      }
    }
    return { patients: patientIds.length, errors }
  }
}
