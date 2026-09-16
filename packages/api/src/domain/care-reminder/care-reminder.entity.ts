export type CareReminderKind = 'measurement' | 'medication' | 'sus_reimport'

export interface CareReminderProps {
  patientId: string
  healthThreadId?: string | null
  reminderKind: CareReminderKind
  targetCode?: string | null
  medicationName?: string | null
  title: string
  intervalMinutes: number
  nextFireAt: Date
  doseHint?: string | null
  active?: boolean
}

export interface CareReminderData {
  id: string
  patientId: string
  healthThreadId: string | null
  reminderKind: CareReminderKind
  targetCode: string | null
  medicationName: string | null
  title: string
  intervalMinutes: number
  nextFireAt: Date
  lastCompletedAt: Date | null
  active: boolean
  doseHint: string | null
  createdAt: Date
  updatedAt: Date
}

export class CareReminder {
  private constructor(private readonly data: CareReminderData) {}

  static create(props: CareReminderProps, id?: string): CareReminder {
    return new CareReminder({
      id: id ?? crypto.randomUUID(),
      patientId: props.patientId,
      healthThreadId: props.healthThreadId ?? null,
      reminderKind: props.reminderKind,
      targetCode: props.targetCode ?? null,
      medicationName: props.medicationName ?? null,
      title: props.title,
      intervalMinutes: props.intervalMinutes,
      nextFireAt: props.nextFireAt,
      lastCompletedAt: null,
      active: props.active ?? true,
      doseHint: props.doseHint ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static restore(data: CareReminderData): CareReminder {
    return new CareReminder(data)
  }

  get id(): string { return this.data.id }
  get patientId(): string { return this.data.patientId }
  get healthThreadId(): string | null { return this.data.healthThreadId }
  get reminderKind(): CareReminderKind { return this.data.reminderKind }
  get targetCode(): string | null { return this.data.targetCode }
  get medicationName(): string | null { return this.data.medicationName }
  get title(): string { return this.data.title }
  get intervalMinutes(): number { return this.data.intervalMinutes }
  get nextFireAt(): Date { return this.data.nextFireAt }
  get lastCompletedAt(): Date | null { return this.data.lastCompletedAt }
  get active(): boolean { return this.data.active }
  get doseHint(): string | null { return this.data.doseHint }

  rescheduleFrom(now: Date): CareReminder {
    return CareReminder.restore({
      ...this.data,
      lastCompletedAt: now,
      nextFireAt: new Date(now.getTime() + this.data.intervalMinutes * 60 * 1000),
      updatedAt: now,
    })
  }

  snooze(minutes: number, now = new Date()): CareReminder {
    return CareReminder.restore({
      ...this.data,
      nextFireAt: new Date(now.getTime() + minutes * 60 * 1000),
      updatedAt: now,
    })
  }

  toJSON(): CareReminderData { return { ...this.data } }
}
