import { ScheduledEvent } from '../../domain/scheduled-event/scheduled-event.entity.js'
import type { ScheduledEventRepository } from '../../domain/scheduled-event/scheduled-event.repository.js'
import type { ScheduledEventFilter } from '../../domain/scheduled-event/scheduled-event.repository.js'
import { inferScheduledEventKind, parseIcsCalendar } from '../../domain/scheduled-event/ics-parser.js'
import { NotFoundError } from '../../domain/errors.js'

export interface IcsImportResult {
  imported: number
  skippedDuplicate: number
  skippedInvalid: number
  totalParsed: number
}

export class ScheduledEventService {
  constructor(private readonly repo: ScheduledEventRepository) {}

  async create(data: {
    patientId: string
    healthThreadId?: string
    title: string
    description?: string
    scheduledAt: Date
    endAt?: Date
    kind?: 'appointment' | 'reminder' | 'task'
    status?: 'planned' | 'done' | 'cancelled'
  }) {
    const event = ScheduledEvent.create(data)
    return this.repo.save(event)
  }

  async importIcs(patientId: string, icsContent: string, sourceLabel?: string): Promise<IcsImportResult> {
    const parsed = parseIcsCalendar(icsContent)
    return this.importParsedEvents(patientId, parsed, {
      source: 'ics_import',
      sourceLabel: sourceLabel?.trim() || 'Calendário externo',
    })
  }

  async importParsedEvents(
    patientId: string,
    parsed: Array<{
      uid: string
      title: string
      description: string | null
      scheduledAt: Date
      endAt: Date | null
    }>,
    options: {
      source: 'ics_import' | 'google' | 'microsoft'
      sourceLabel?: string
    },
  ): Promise<IcsImportResult> {
    let imported = 0
    let skippedDuplicate = 0
    let skippedInvalid = 0

    for (const item of parsed) {
      if (!item.title.trim() || !item.scheduledAt || Number.isNaN(item.scheduledAt.getTime())) {
        skippedInvalid += 1
        continue
      }

      const existingUid = await this.repo.findByExternalUid(patientId, item.uid)
      if (existingUid) {
        skippedDuplicate += 1
        continue
      }

      const fuzzy = await this.repo.findFuzzyDuplicate(patientId, item.title, item.scheduledAt)
      if (fuzzy) {
        skippedDuplicate += 1
        continue
      }

      const event = ScheduledEvent.create({
        patientId,
        title: item.title,
        description: item.description ?? undefined,
        scheduledAt: item.scheduledAt,
        endAt: item.endAt ?? undefined,
        kind: inferScheduledEventKind(item.title),
        source: options.source,
        externalUid: item.uid,
        sourceLabel: options.sourceLabel?.trim() || undefined,
      })
      await this.repo.save(event)
      imported += 1
    }

    return {
      imported,
      skippedDuplicate,
      skippedInvalid,
      totalParsed: parsed.length,
    }
  }

  async findById(id: string) {
    const event = await this.repo.findById(id)
    if (!event) throw new NotFoundError('ScheduledEvent', id)
    return event
  }

  async findAll(filter?: ScheduledEventFilter) {
    return this.repo.findAll(filter)
  }

  async update(id: string, data: Partial<{
    healthThreadId: string | null
    title: string
    description: string | null
    scheduledAt: Date
    endAt: Date | null
    kind: 'appointment' | 'reminder' | 'task'
    status: 'planned' | 'done' | 'cancelled'
  }>) {
    const existing = await this.findById(id)
    const merged = ScheduledEvent.restore({
      ...existing.toJSON(),
      ...data,
      updatedAt: new Date(),
    })
    return this.repo.update(merged)
  }

  async delete(id: string) {
    await this.findById(id)
    await this.repo.delete(id)
  }
}
