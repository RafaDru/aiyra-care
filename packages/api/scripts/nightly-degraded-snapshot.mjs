/**
 * Snapshot D-1 carteira/timeline para modo degraded_read (L3).
 * Uso: npm run ops:degraded-snapshot
 */
import pg from 'pg'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { PatientContextService } from '../src/application/patient/patient-context.service.js'
import { DegradedReadSnapshotService } from '../src/application/ops/degraded-read-snapshot.service.js'
import { RuntimeDegradedPgRepository } from '../src/infrastructure/persistence/runtime-degraded.pg.repository.js'
import { PatientPgRepository } from '../src/infrastructure/persistence/patient.pg.repository.js'
import { AllergyPgRepository } from '../src/infrastructure/persistence/allergy.pg.repository.js'
import { MedicationPgRepository } from '../src/infrastructure/persistence/medication.pg.repository.js'
import { MedicalRecordPgRepository } from '../src/infrastructure/persistence/medical-record.pg.repository.js'
import { ExamPgRepository } from '../src/infrastructure/persistence/exam.pg.repository.js'
import { VaccinePgRepository } from '../src/infrastructure/persistence/vaccine.pg.repository.js'
import { DocumentPgRepository } from '../src/infrastructure/persistence/document.pg.repository.js'
import { AuthorizationPgRepository } from '../src/infrastructure/persistence/authorization.pg.repository.js'
import { IntegrationLinkPgRepository } from '../src/infrastructure/persistence/integration-link.pg.repository.js'
import { InsurancePlanService } from '../src/application/insurance-plan/insurance-plan.service.js'
import { InsurancePlanPgRepository } from '../src/infrastructure/persistence/insurance-plan.pg.repository.js'
import { PlanMembershipPgRepository } from '../src/infrastructure/persistence/plan-membership.pg.repository.js'
import { HealthThreadPgRepository } from '../src/infrastructure/persistence/health-thread.pg.repository.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres123@127.0.0.1:5432/openhealth',
})

async function main() {
  const repo = new RuntimeDegradedPgRepository(pool)
  const contextService = new PatientContextService(
    pool,
    new PatientPgRepository(pool),
    new AllergyPgRepository(pool),
    new MedicationPgRepository(pool),
    new MedicalRecordPgRepository(pool),
    new ExamPgRepository(pool),
    new VaccinePgRepository(pool),
    new DocumentPgRepository(pool),
    new AuthorizationPgRepository(pool),
    new IntegrationLinkPgRepository(pool),
    new InsurancePlanService(
      new InsurancePlanPgRepository(pool),
      new PlanMembershipPgRepository(pool),
    ),
    new HealthThreadPgRepository(pool),
  )
  const svc = new DegradedReadSnapshotService(repo, contextService)
  const result = await svc.runNightlyBatch()
  console.log(JSON.stringify(result, null, 2))
  await pool.end()
}

main().catch(async (err) => {
  console.error(err)
  await pool.end()
  process.exit(1)
})
