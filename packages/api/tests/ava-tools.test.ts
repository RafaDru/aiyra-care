import { describe, expect, it } from 'vitest'
import { runAvaContextTools } from '../src/domain/llm/ava-tools.js'

describe('ava context tools', () => {
  it('runs patient + family tools by default', async () => {
    const events: string[] = []
    const { trace } = await runAvaContextTools(
      {
        loadPatientContext: async () => ({
          block: 'ctx',
          clinicianLabel: 'pediatra',
          ageCategory: 'child',
        }),
        loadFamilyInsights: async (patientId) => ({
          patientId,
          disclaimer: 'd',
          insights: [],
          generatedAt: '2026-01-01T00:00:00.000Z',
        }),
        loadOperationalBlock: async () => 'ops',
        loadEntityPinBlock: async () => 'pin',
      },
      { patientId: 'p1', message: 'como está o hemograma?' },
      (ev) => events.push(`${ev.code}:${ev.status}`),
    )

    expect(events).toContain('context.patient_record:start')
    expect(events).toContain('context.patient_record:done')
    expect(events).toContain('context.family_alerts:start')
    expect(trace.some((t) => t.code === 'context.operational' && t.status === 'skip')).toBe(true)
  })

  it('loads operational block when message mentions sync', async () => {
    const events: string[] = []
    await runAvaContextTools(
      {
        loadPatientContext: async () => ({
          block: 'ctx',
          clinicianLabel: 'pediatra',
          ageCategory: 'child',
        }),
        loadFamilyInsights: async (patientId) => ({
          patientId,
          disclaimer: 'd',
          insights: [],
          generatedAt: '2026-01-01T00:00:00.000Z',
        }),
        loadOperationalBlock: async () => 'INTEGRAÇÕES',
        loadEntityPinBlock: async () => 'pin',
      },
      { patientId: 'p1', message: 'preciso sincronizar a Unimed' },
      (ev) => events.push(`${ev.code}:${ev.status}`),
    )

    expect(events).toContain('context.operational:start')
    expect(events).toContain('context.operational:done')
  })
})
