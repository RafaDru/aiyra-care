import { NotFoundError } from '../../domain/errors.js'
import type { CareReminderRepository } from '../../domain/care-reminder/care-reminder.repository.js'
import { CareReminder } from '../../domain/care-reminder/care-reminder.entity.js'
import type { CareReminderProps } from '../../domain/care-reminder/care-reminder.entity.js'

export type IllnessMonitoringPack = {
  healthThreadId: string
  vitalsIntervalMinutes?: number
  medicationName?: string
  medicationIntervalMinutes?: number
  doseHint?: string
}

export class CareReminderService {
  constructor(private readonly repo: CareReminderRepository) {}

  async findById(id: string) {
    const row = await this.repo.findById(id)
    if (!row) throw new NotFoundError('CareReminder', id)
    return row
  }

  list(filter: Parameters<CareReminderRepository['findAll']>[0]) {
    return this.repo.findAll(filter)
  }

  listPending(patientId: string) {
    return this.repo.findAll({ patientId, activeOnly: true, pendingOnly: true })
  }

  async create(data: CareReminderProps) {
    const reminder = CareReminder.create(data)
    return this.repo.save(reminder)
  }

  async createIllnessPack(patientId: string, pack: IllnessMonitoringPack) {
    const now = new Date()
    const vitalsInterval = pack.vitalsIntervalMinutes ?? 240
    const created: CareReminder[] = []

    const vitals = await this.create({
      patientId,
      healthThreadId: pack.healthThreadId,
      reminderKind: 'measurement',
      targetCode: 'vitals_bundle',
      title: 'Medir temperatura, batimentos e saturação',
      intervalMinutes: vitalsInterval,
      nextFireAt: now,
    })
    created.push(vitals)

    if (pack.medicationName?.trim()) {
      const medInterval = pack.medicationIntervalMinutes ?? 360
      const med = await this.create({
        patientId,
        healthThreadId: pack.healthThreadId,
        reminderKind: 'medication',
        medicationName: pack.medicationName.trim(),
        title: `Medicação: ${pack.medicationName.trim()}`,
        intervalMinutes: medInterval,
        nextFireAt: now,
        doseHint: pack.doseHint,
      })
      created.push(med)
    }

    return created
  }

  async complete(id: string) {
    const existing = await this.findById(id)
    const updated = existing.rescheduleFrom(new Date())
    return this.repo.update(updated)
  }

  async snooze(id: string, minutes = 30) {
    const existing = await this.findById(id)
    const updated = existing.snooze(minutes)
    return this.repo.update(updated)
  }

  async deactivate(id: string) {
    const existing = await this.findById(id)
    const d = existing.toJSON()
    return this.repo.update(CareReminder.restore({ ...d, active: false, updatedAt: new Date() }))
  }
}
