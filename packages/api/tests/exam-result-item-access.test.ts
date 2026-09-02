import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest'
import { Exam } from '../src/domain/exam/exam.entity.js'
import { ExamResultItem } from '../src/domain/exam-result-item/exam-result-item.entity.js'
import { NotFoundError } from '../src/domain/errors.js'
import { ExamResultItemController } from '../src/infrastructure/http/exam-result-item/exam-result-item.controller.js'
import type { AuthenticatedRequest } from '../src/infrastructure/http/auth/auth.middleware.js'

const ALLOWED_PATIENT = '11111111-1111-1111-1111-111111111111'
const OTHER_PATIENT = '22222222-2222-2222-2222-222222222222'
const EXAM_ID = '33333333-3333-3333-3333-333333333333'
const OTHER_EXAM_ID = '44444444-4444-4444-4444-444444444444'

const prevUrl = process.env.SUPABASE_URL
const prevRole = process.env.SUPABASE_SERVICE_ROLE

beforeAll(() => {
  process.env.SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE = 'test-service-role'
})

afterAll(() => {
  if (prevUrl === undefined) delete process.env.SUPABASE_URL
  else process.env.SUPABASE_URL = prevUrl
  if (prevRole === undefined) delete process.env.SUPABASE_SERVICE_ROLE
  else process.env.SUPABASE_SERVICE_ROLE = prevRole
})

function mockReply() {
  const reply = {
    statusCode: 200,
    payload: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    send(body: unknown) {
      this.payload = body
      return this
    },
  }
  return reply
}

function mockReq(overrides: Record<string, unknown> = {}): AuthenticatedRequest {
  return {
    accountId: 'acc-1',
    allowedPatientIds: new Set([ALLOWED_PATIENT]),
    query: {},
    params: {},
    body: {},
    ...overrides,
  } as unknown as AuthenticatedRequest
}

function makeExam(patientId: string, id = EXAM_ID) {
  return Exam.create({
    patientId,
    examType: 'Hemograma',
    examDate: new Date('2026-01-15'),
  }, id)
}

function makeMarker(patientId: string, examId = EXAM_ID) {
  return ExamResultItem.create({
    examId,
    patientId,
    markerName: 'Glicose',
    displayValue: '95',
    collectedAt: new Date('2026-01-15'),
  })
}

describe('ExamResultItemController patient access', () => {
  it('GET /exam-markers without patientId is 400 (does not dump all markers)', async () => {
    const service = { listByPatient: vi.fn() }
    const exams = { findById: vi.fn() }
    const controller = new ExamResultItemController(service as never, exams as never)
    const reply = mockReply()
    await controller.listByPatient(mockReq({ query: {} }), reply as never)
    expect(reply.statusCode).toBe(400)
    expect(service.listByPatient).not.toHaveBeenCalled()
  })

  it('GET /exam-markers for another patient is 403', async () => {
    const service = { listByPatient: vi.fn() }
    const exams = { findById: vi.fn() }
    const controller = new ExamResultItemController(service as never, exams as never)
    const reply = mockReply()
    await controller.listByPatient(
      mockReq({ query: { patientId: OTHER_PATIENT } }),
      reply as never,
    )
    expect(reply.statusCode).toBe(403)
    expect(service.listByPatient).not.toHaveBeenCalled()
  })

  it('GET /exam-markers for an allowed patient lists markers', async () => {
    const marker = makeMarker(ALLOWED_PATIENT)
    const service = { listByPatient: vi.fn(async () => [marker]) }
    const exams = { findById: vi.fn() }
    const controller = new ExamResultItemController(service as never, exams as never)
    const reply = mockReply()
    await controller.listByPatient(
      mockReq({ query: { patientId: ALLOWED_PATIENT } }),
      reply as never,
    )
    expect(reply.statusCode).toBe(200)
    expect(service.listByPatient).toHaveBeenCalledWith(ALLOWED_PATIENT, undefined)
    expect(reply.payload).toEqual([marker.toJSON()])
  })

  it('GET trends for another patient is 403', async () => {
    const service = { getMarkerTrends: vi.fn() }
    const exams = { findById: vi.fn() }
    const controller = new ExamResultItemController(service as never, exams as never)
    const reply = mockReply()
    await controller.getMarkerTrends(
      mockReq({ params: { patientId: OTHER_PATIENT } }),
      reply as never,
    )
    expect(reply.statusCode).toBe(403)
    expect(service.getMarkerTrends).not.toHaveBeenCalled()
  })

  it('GET /exams/:id/markers for another patient exam is 403', async () => {
    const service = { listByExam: vi.fn() }
    const exams = { findById: vi.fn(async () => makeExam(OTHER_PATIENT)) }
    const controller = new ExamResultItemController(service as never, exams as never)
    const reply = mockReply()
    await controller.listByExam(mockReq({ params: { examId: EXAM_ID } }), reply as never)
    expect(reply.statusCode).toBe(403)
    expect(service.listByExam).not.toHaveBeenCalled()
  })

  it('GET /exams/:id/markers returns 404 when exam is missing', async () => {
    const service = { listByExam: vi.fn() }
    const exams = {
      findById: vi.fn(async () => {
        throw new NotFoundError('Exam', EXAM_ID)
      }),
    }
    const controller = new ExamResultItemController(service as never, exams as never)
    const reply = mockReply()
    await controller.listByExam(mockReq({ params: { examId: EXAM_ID } }), reply as never)
    expect(reply.statusCode).toBe(404)
    expect(service.listByExam).not.toHaveBeenCalled()
  })

  it('POST /exam-markers/batch for another patient is 403', async () => {
    const service = { createBatch: vi.fn() }
    const exams = { findById: vi.fn() }
    const controller = new ExamResultItemController(service as never, exams as never)
    const reply = mockReply()
    await controller.createBatch(
      mockReq({
        body: {
          items: [{
            examId: EXAM_ID,
            patientId: OTHER_PATIENT,
            markerName: 'Glicose',
            displayValue: '95',
            collectedAt: '2026-01-15',
          }],
        },
      }),
      reply as never,
    )
    expect(reply.statusCode).toBe(403)
    expect(service.createBatch).not.toHaveBeenCalled()
    expect(exams.findById).not.toHaveBeenCalled()
  })

  it('POST /exam-markers/batch rejects exam belonging to a different patient', async () => {
    const service = { createBatch: vi.fn() }
    const exams = { findById: vi.fn(async () => makeExam(OTHER_PATIENT, OTHER_EXAM_ID)) }
    const controller = new ExamResultItemController(service as never, exams as never)
    const reply = mockReply()
    await controller.createBatch(
      mockReq({
        body: {
          items: [{
            examId: OTHER_EXAM_ID,
            patientId: ALLOWED_PATIENT,
            markerName: 'Glicose',
            displayValue: '95',
            collectedAt: '2026-01-15',
          }],
        },
      }),
      reply as never,
    )
    expect(reply.statusCode).toBe(400)
    expect(service.createBatch).not.toHaveBeenCalled()
  })

  it('POST /exam-markers/batch writes markers for an allowed patient and matching exam', async () => {
    const created = [makeMarker(ALLOWED_PATIENT)]
    const service = { createBatch: vi.fn(async () => created) }
    const exams = { findById: vi.fn(async () => makeExam(ALLOWED_PATIENT)) }
    const controller = new ExamResultItemController(service as never, exams as never)
    const reply = mockReply()
    await controller.createBatch(
      mockReq({
        body: {
          items: [{
            examId: EXAM_ID,
            patientId: ALLOWED_PATIENT,
            markerName: 'Glicose',
            displayValue: '95',
            collectedAt: '2026-01-15',
          }],
        },
      }),
      reply as never,
    )
    expect(reply.statusCode).toBe(201)
    expect(service.createBatch).toHaveBeenCalledOnce()
  })
})
