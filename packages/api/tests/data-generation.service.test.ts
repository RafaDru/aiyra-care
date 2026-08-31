import { describe, expect, it, vi } from 'vitest'
import { DataGenerationService } from '../src/application/data-generation/data-generation.service.js'
import type { DataGenerationPgRepository } from '../src/infrastructure/persistence/data-generation.pg.repository.js'
import type { PatientMembershipRepository } from '../src/domain/auth/app-account.repository.js'

function mockRepo(): DataGenerationPgRepository {
  return {
    bump: vi.fn(async () => '2026-08-01T12:00:00.000Z'),
    getGeneration: vi.fn(async () => null),
    listForAccount: vi.fn(async () => []),
  } as unknown as DataGenerationPgRepository
}

function mockMemberships(patientIds: string[] = []): PatientMembershipRepository {
  return {
    listAccessiblePatientIds: vi.fn(async () => patientIds),
  } as unknown as PatientMembershipRepository
}

describe('DataGenerationService', () => {
  it('bumpAfterSyncSuccess inclui exams quando há novidade de exames', async () => {
    const repo = mockRepo()
    const svc = new DataGenerationService(repo, mockMemberships())
    await svc.bumpAfterSyncSuccess('acc-1', 'pat-1', {
      newExamRecords: 1,
      portalExams: 0,
      filesDownloaded: 0,
      newMedicalRecords: 0,
      portalMedicalRecords: 0,
    })
    expect(repo.bump).toHaveBeenCalled()
    const domains = (repo.bump as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[2])
    expect(domains).toContain('exams')
    expect(domains).toContain('wallet')
    expect(domains).toContain('timeline')
  })

  it('bumpAfterHygieneResolve inclui wallet para autorização', async () => {
    const repo = mockRepo()
    const svc = new DataGenerationService(repo, mockMemberships())
    await svc.bumpAfterHygieneResolve('acc-1', 'pat-1', 'authorization')
    const domains = (repo.bump as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[2])
    expect(domains).toContain('wallet')
    expect(domains).toContain('hygiene')
  })
})
