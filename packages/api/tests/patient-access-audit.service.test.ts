import { describe, expect, it, vi } from 'vitest'
import { PatientAccessAuditService } from '../src/application/patient-access/patient-access-audit.service.js'

describe('PatientAccessAuditService', () => {
  it('nega listagem para não-titular', async () => {
    const pool = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('owner_account_id')) {
          return { rows: [{ owner_account_id: 'owner-1' }] }
        }
        return { rows: [] }
      }),
    }
    const svc = new PatientAccessAuditService(pool as never)
    await expect(svc.listForPatientOwner('patient-1', 'other')).rejects.toThrow('PATIENT_ACCESS_FORBIDDEN')
  })
})
