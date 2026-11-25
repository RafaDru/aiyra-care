import { describe, expect, it } from 'vitest'
import { conversationListLabel } from '../src/lib/ava-conversation-label.js'
import type { AvaConversation } from '../src/lib/api.types.js'

const base: AvaConversation = {
  id: 'c1',
  accountId: 'a1',
  patientId: 'p1',
  healthThreadId: null,
  title: null,
  status: 'active',
  lastActivityAt: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

describe('conversationListLabel', () => {
  it('uses title when present', () => {
    expect(conversationListLabel({ ...base, title: 'Febre ontem' }, 'Resume')).toBe('Febre ontem')
  })

  it('falls back when title empty', () => {
    expect(conversationListLabel(base, 'Continuar conversa')).toBe('Continuar conversa')
  })
})
