import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CareReminderService } from '../src/application/care-reminder/care-reminder.service.js'
import { CareReminder } from '../src/domain/care-reminder/care-reminder.entity.js'

function makeRepo() {
  const rows: CareReminder[] = []
  return {
    findById: vi.fn(async (id: string) => rows.find((r) => r.id === id) ?? null),
    findAll: vi.fn(async () => rows),
    save: vi.fn(async (r: CareReminder) => {
      rows.push(r)
      return r
    }),
    update: vi.fn(async (r: CareReminder) => {
      const i = rows.findIndex((x) => x.id === r.id)
      if (i >= 0) rows[i] = r
      return r
    }),
    delete: vi.fn(),
  }
}

describe('CareReminderService', () => {
  let repo: ReturnType<typeof makeRepo>
  let service: CareReminderService

  beforeEach(() => {
    repo = makeRepo()
    service = new CareReminderService(repo as never)
  })

  it('createIllnessPack creates vitals + optional medication', async () => {
    const created = await service.createIllnessPack('p1', {
      healthThreadId: 'th1',
      medicationName: 'Dipirona',
      doseHint: '5ml',
    })
    expect(created.length).toBe(2)
    expect(created[0].reminderKind).toBe('measurement')
    expect(created[1].medicationName).toBe('Dipirona')
  })

  it('complete reschedules next_fire_at', async () => {
    const r = await service.create({
      patientId: 'p1',
      reminderKind: 'measurement',
      title: 'Test',
      intervalMinutes: 60,
      nextFireAt: new Date('2026-01-01T00:00:00Z'),
    })
    const done = await service.complete(r.id)
    expect(done.nextFireAt.getTime()).toBeGreaterThan(Date.now() - 5000)
  })
})
