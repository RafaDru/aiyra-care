import { describe, it, expect, vi } from 'vitest'
import { AvaEntityContextService } from '../src/application/llm/ava-entity-context.service.js'
import { Exam } from '../src/domain/exam/exam.entity.js'
import { ExamOrder } from '../src/domain/exam-order/exam-order.entity.js'
import { ExamResultItem } from '../src/domain/exam-result-item/exam-result-item.entity.js'
import { Authorization } from '../src/domain/authorization/authorization.entity.js'
import { MedicalRecord } from '../src/domain/medical-record/medical-record.entity.js'
import { NotFoundError } from '../src/domain/errors.js'

describe('AvaEntityContextService', () => {
  const patientId = '11111111-1111-4111-8111-111111111111'
  const otherPatient = '22222222-2222-4222-8222-222222222222'

  it('builds exam pin block', async () => {
    const exam = Exam.create({
      patientId,
      examType: 'Hemograma',
      examDate: new Date('2024-06-15'),
      laboratory: 'Lab X',
      resultSummary: 'Leucócitos elevados',
    }, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')

    const service = new AvaEntityContextService(
      { findById: vi.fn().mockResolvedValue(exam) },
      { findById: vi.fn() },
      { findById: vi.fn(), findAll: vi.fn() },
    )

    const block = await service.buildPinBlock(patientId, {
      entityType: 'exam',
      entityId: exam.id,
    })

    expect(block).toContain('Tipo: exame')
    expect(block).toContain('Hemograma')
    expect(block).toContain('Leucócitos elevados')
  })

  it('rejects exam pin for wrong patient', async () => {
    const exam = Exam.create({
      patientId: otherPatient,
      examType: 'Hemograma',
      examDate: new Date('2024-06-15'),
    }, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')

    const service = new AvaEntityContextService(
      { findById: vi.fn().mockResolvedValue(exam) },
      { findById: vi.fn() },
      { findById: vi.fn(), findAll: vi.fn() },
    )

    await expect(
      service.buildPinBlock(patientId, { entityType: 'exam', entityId: exam.id }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('builds exam order pin block', async () => {
    const order = ExamOrder.create({
      patientId,
      externalKey: 'ord-1',
      source: 'mater_dei',
      orderDate: new Date('2024-05-01'),
      laboratory: 'Mater Dei',
      portalOrderId: 'P123',
    }, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc')

    const service = new AvaEntityContextService(
      { findById: vi.fn() },
      { findById: vi.fn().mockResolvedValue(order) },
      { findById: vi.fn(), findAll: vi.fn() },
    )

    const block = await service.buildPinBlock(patientId, {
      entityType: 'exam_order',
      entityId: order.id,
    })

    expect(block).toContain('pedido de exame')
    expect(block).toContain('Mater Dei')
    expect(block).toContain('P123')
  })

  it('builds marker series pin from result items', async () => {
    const items = [
      ExamResultItem.create({
        patientId,
        examId: 'exam-1',
        markerName: 'Hemoglobina',
        displayValue: '12.1',
        unit: 'g/dL',
        referenceRange: '11.5-14.5',
        collectedAt: new Date('2024-01-10'),
      }, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
      ExamResultItem.create({
        patientId,
        examId: 'exam-2',
        markerName: 'Hemoglobina',
        displayValue: '11.0',
        unit: 'g/dL',
        referenceRange: '11.5-14.5',
        status: 'altered',
        collectedAt: new Date('2024-06-10'),
      }, 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),
    ]

    const service = new AvaEntityContextService(
      { findById: vi.fn() },
      { findById: vi.fn() },
      {
        findById: vi.fn(),
        findAll: vi.fn().mockResolvedValue(items),
      },
    )

    const block = await service.buildPinBlock(patientId, {
      entityType: 'exam_marker',
      markerName: 'Hemoglobina',
    })

    expect(block).toContain('série')
    expect(block).toContain('11.0 g/dL')
    expect(block).toContain('Histórico recente')
  })

  it('builds authorization pin block', async () => {
    const auth = Authorization.create(
      {
        patientId,
        classification: 'Ressonância joelho',
        status: 'authorized',
        authorizationDate: new Date('2024-03-01'),
        guideNumber: 'G-99',
      },
      'ffffffff-ffff-4fff-8fff-ffffffffffff',
    )

    const service = new AvaEntityContextService(
      { findById: vi.fn() },
      { findById: vi.fn() },
      { findById: vi.fn(), findAll: vi.fn() },
      { findById: vi.fn().mockResolvedValue(auth), findAll: vi.fn() },
      { findById: vi.fn(), findAll: vi.fn() },
    )

    const block = await service.buildPinBlock(patientId, {
      entityType: 'authorization',
      entityId: auth.id,
    })

    expect(block).toContain('autorização')
    expect(block).toContain('Ressonância joelho')
    expect(block).toContain('G-99')
  })

  it('builds medical record pin block', async () => {
    const record = MedicalRecord.create(
      {
        patientId,
        recordDate: new Date('2024-02-10'),
        recordType: 'consulta',
        description: 'Retorno pediatria',
        doctorName: 'Dr. Silva',
      },
      '10101010-1010-4101-8101-010101010101',
    )

    const service = new AvaEntityContextService(
      { findById: vi.fn() },
      { findById: vi.fn() },
      { findById: vi.fn(), findAll: vi.fn() },
      { findById: vi.fn(), findAll: vi.fn() },
      { findById: vi.fn().mockResolvedValue(record), findAll: vi.fn() },
    )

    const block = await service.buildPinBlock(patientId, {
      entityType: 'medical_record',
      entityId: record.id,
    })

    expect(block).toContain('atendimento')
    expect(block).toContain('consulta')
    expect(block).toContain('Retorno pediatria')
  })
})
