import { describe, it, expect, vi } from 'vitest'
import { AvaOperationalContextService } from '../src/application/llm/ava-operational-context.service.js'
import { IntegrationLink } from '../src/domain/integration-link/integration-link.entity.js'
import { Exam } from '../src/domain/exam/exam.entity.js'

describe('AvaOperationalContextService', () => {
  const patientId = '11111111-1111-4111-8111-111111111111'

  it('includes navigation and integration sync hints', async () => {
    const link = IntegrationLink.create({
      patientId,
      portalType: 'unimed',
      lastSyncAt: new Date('2024-06-01T10:00:00Z'),
      sessionExpiresAt: new Date('2030-01-01'),
    })

    const exam = Exam.create({
      patientId,
      examType: 'Hemograma',
      examDate: new Date('2024-05-20'),
      resultSummary: 'ok',
      resultFileUrl: '/files/1.pdf',
    }, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')

    const service = new AvaOperationalContextService(
      { findAllByPatient: vi.fn().mockResolvedValue([link]) },
      { findAll: vi.fn().mockResolvedValue([exam]) },
    )

    const block = await service.buildOperationalBlock(patientId)

    expect(block).toContain('NAVEGAÇÃO NO APP')
    expect(block).toContain('/patients/')
    expect(block).toContain('tab=exams')
    expect(block).toContain('Unimed BH')
    expect(block).toContain('Hemograma')
    expect(block).toContain('highlight=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
  })
})
