import { describe, expect, it, vi } from 'vitest'
import {
  AvaSessionContextService,
  avaEntityPinToSessionFields,
  avaSessionPinToEntityPin,
} from '../src/application/llm/ava-session-context.service.js'
import type { AvaSessionContextRepository, AvaSessionPinRow } from '../src/domain/ava/ava-session-context.repository.js'

function makeRepo(): AvaSessionContextRepository {
  const pins: AvaSessionPinRow[] = []
  return {
    listActive: async (conversationId) => pins.filter((p) => p.conversationId === conversationId && p.active),
    upsertPin: async (input) => {
      const existing = pins.find(
        (p) => p.conversationId === input.conversationId
          && p.entityType === input.entityType
          && p.entityId === input.entityId,
      )
      if (existing) {
        existing.active = true
        existing.label = input.label ?? existing.label
        return existing
      }
      const row: AvaSessionPinRow = {
        id: `pin-${pins.length + 1}`,
        conversationId: input.conversationId,
        entityType: input.entityType,
        entityId: input.entityId,
        patientId: input.patientId,
        label: input.label ?? null,
        source: input.source,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      pins.push(row)
      return row
    },
    deactivatePin: async (conversationId, entityType, entityId) => {
      const pin = pins.find(
        (p) => p.conversationId === conversationId && p.entityType === entityType && p.entityId === entityId,
      )
      if (pin) pin.active = false
    },
    deactivateAll: async () => {},
  }
}

describe('avaEntityPinToSessionFields', () => {
  it('maps exam_marker to entity_id string', () => {
    const fields = avaEntityPinToSessionFields({ entityType: 'exam_marker', markerName: 'Hemoglobina' })
    expect(fields).toEqual({ entityType: 'exam_marker', entityId: 'Hemoglobina' })
  })
})

describe('AvaSessionContextService', () => {
  it('pins and lists active', async () => {
    const repo = makeRepo()
    const svc = new AvaSessionContextService(repo)
    await svc.pin('conv-1', {
      pin: { entityType: 'exam', entityId: 'exam-1' },
      patientId: 'pat-1',
      source: 'accelerator',
      label: 'Hemograma',
    })
    const active = await svc.listActive('conv-1')
    expect(active.length).toBe(1)
    expect(active[0].label).toBe('Hemograma')
  })

  it('builds combined block from entity context', async () => {
    const repo = makeRepo()
    const entityContext = {
      buildPinBlock: vi.fn(async () => 'Tipo: exame\nNome: Hemograma'),
    }
    const svc = new AvaSessionContextService(repo, entityContext as never)
    const row = await svc.pin('conv-1', {
      pin: { entityType: 'exam', entityId: 'exam-1' },
      patientId: 'pat-1',
      label: 'Hemograma',
    })
    const pin = avaSessionPinToEntityPin(row)
    expect(pin.entityType).toBe('exam')
    const block = await svc.buildSessionPinsBlock('pat-1', 'conv-1')
    expect(block).toContain('REGISTROS PINADOS')
    expect(block).toContain('Hemograma')
  })
})
