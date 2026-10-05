import { describe, expect, it } from 'vitest'
import {
  investigationWizardSchema,
  taskWizardSchema,
} from '../src/infrastructure/http/health-thread/health-thread.schema.js'

const patientId = '550e8400-e29b-41d4-a716-446655440000'

describe('health-thread wizard schemas', () => {
  it('investigationWizardSchema accepts null optional fields (Ant Design Form)', () => {
    const parsed = investigationWizardSchema.safeParse({
      patientId,
      title: 'Adenoides',
      reason: null,
      workingHypothesis: null,
      symptoms: null,
      plannedSteps: null,
    })
    expect(parsed.success).toBe(true)
  })

  it('investigationWizardSchema rejects whitespace-only title', () => {
    const parsed = investigationWizardSchema.safeParse({
      patientId,
      title: '   ',
    })
    expect(parsed.success).toBe(false)
  })

  it('taskWizardSchema accepts null optional fields', () => {
    const parsed = taskWizardSchema.safeParse({
      patientId,
      title: 'Checkup',
      summary: null,
      assignee: null,
      location: null,
      dueDate: null,
    })
    expect(parsed.success).toBe(true)
  })
})
