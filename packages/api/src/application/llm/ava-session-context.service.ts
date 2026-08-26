import type { AvaEntityPin } from './ava-entity-context.service.js'
import type { AvaEntityContextService } from './ava-entity-context.service.js'
import type {
  AvaSessionContextRepository,
  AvaSessionPinEntityType,
  AvaSessionPinRow,
  AvaSessionPinSource,
} from '../../domain/ava/ava-session-context.repository.js'

export function avaSessionPinToEntityPin(row: AvaSessionPinRow): AvaEntityPin {
  if (row.entityType === 'exam_marker') {
    return { entityType: 'exam_marker', markerName: row.entityId }
  }
  return { entityType: row.entityType, entityId: row.entityId } as AvaEntityPin
}

export function avaEntityPinToSessionFields(pin: AvaEntityPin): {
  entityType: AvaSessionPinEntityType
  entityId: string
} {
  if (pin.entityType === 'exam_marker') {
    return { entityType: 'exam_marker', entityId: pin.markerName }
  }
  return { entityType: pin.entityType, entityId: pin.entityId }
}

export class AvaSessionContextService {
  constructor(
    private readonly repo: AvaSessionContextRepository,
    private readonly entityContext?: AvaEntityContextService,
  ) {}

  async listActive(conversationId: string) {
    return this.repo.listActive(conversationId)
  }

  async pin(
    conversationId: string,
    input: {
      pin: AvaEntityPin
      patientId: string
      label?: string
      source?: AvaSessionPinSource
    },
  ) {
    const { entityType, entityId } = avaEntityPinToSessionFields(input.pin)
    return this.repo.upsertPin({
      conversationId,
      entityType,
      entityId,
      patientId: input.patientId,
      label: input.label ?? null,
      source: input.source ?? 'user',
    })
  }

  async unpin(conversationId: string, pin: AvaEntityPin) {
    const { entityType, entityId } = avaEntityPinToSessionFields(pin)
    await this.repo.deactivatePin(conversationId, entityType, entityId)
  }

  async buildSessionPinsBlock(patientId: string, conversationId: string): Promise<string> {
    if (!this.entityContext) return ''
    const pins = await this.repo.listActive(conversationId)
    if (!pins.length) return ''

    const blocks: string[] = []
    for (const row of pins) {
      const pin = avaSessionPinToEntityPin(row)
      const pinPatientId = row.patientId
      try {
        const block = await this.entityContext.buildPinBlock(pinPatientId, pin)
        const title = row.label?.trim() || row.entityType
        blocks.push(`[${title}]\n${block}`)
      } catch {
        // pin obsoleto — ignorar no prompt
      }
    }
    if (!blocks.length) return ''
    return `REGISTROS PINADOS NA CONVERSA (priorize na resposta):\n${blocks.join('\n\n')}`
  }
}
