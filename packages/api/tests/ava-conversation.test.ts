import { describe, expect, it } from 'vitest'
import {
  AvaConversationService,
  avaConversationTitleFromMessage,
} from '../src/application/llm/ava-conversation.service.js'
import type {
  AvaConversationRepository,
  AvaConversationRow,
  AvaMessageRow,
} from '../src/domain/ava/ava-conversation.repository.js'

function makeRepo(seed?: {
  conversations?: AvaConversationRow[]
  messages?: AvaMessageRow[]
}): AvaConversationRepository {
  const conversations = [...(seed?.conversations ?? [])]
  const messages = [...(seed?.messages ?? [])]

  return {
    findById: async (id) => conversations.find((c) => c.id === id) ?? null,
    listByAccount: async (accountId, patientId) =>
      conversations.filter((c) => c.accountId === accountId && (!patientId || c.patientId === patientId)),
    create: async (input) => {
      const row: AvaConversationRow = {
        id: `conv-${conversations.length + 1}`,
        accountId: input.accountId,
        patientId: input.patientId,
        healthThreadId: input.healthThreadId ?? null,
        title: input.title ?? null,
        status: 'active',
        lastActivityAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      conversations.push(row)
      return row
    },
    touchActivity: async (id, title) => {
      const conv = conversations.find((c) => c.id === id)
      if (conv) {
        conv.lastActivityAt = new Date()
        if (title && !conv.title) conv.title = title
      }
    },
    listMessages: async (conversationId, limit = 50) =>
      messages.filter((m) => m.conversationId === conversationId).slice(0, limit),
    appendMessage: async (input) => {
      const row: AvaMessageRow = {
        id: `msg-${messages.length + 1}`,
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        documentId: input.documentId ?? null,
        metadata: input.metadata ?? null,
        createdAt: new Date(),
      }
      messages.push(row)
      return row
    },
  }
}

describe('avaConversationTitleFromMessage', () => {
  it('truncates long titles', () => {
    const long = 'a'.repeat(100)
    const title = avaConversationTitleFromMessage(long)
    expect(title.length).toBeLessThanOrEqual(80)
    expect(title.endsWith('…')).toBe(true)
  })
})

describe('AvaConversationService', () => {
  it('creates conversation when id missing', async () => {
    const repo = makeRepo()
    const svc = new AvaConversationService(repo)
    const conv = await svc.ensureConversation('acc-1', {
      patientId: 'pat-1',
      firstMessage: 'Febre desde ontem',
    })
    expect(conv.patientId).toBe('pat-1')
    expect(conv.title).toBe('Febre desde ontem')
  })

  it('persists user and assistant messages', async () => {
    const repo = makeRepo()
    const svc = new AvaConversationService(repo)
    const conv = await svc.ensureConversation('acc-1', {
      patientId: 'pat-1',
      firstMessage: 'Oi',
    })
    await svc.persistTurn('acc-1', {
      conversationId: conv.id,
      userMessage: 'Oi',
      assistantMessage: 'Olá!',
    })
    const loaded = await svc.getMessages('acc-1', conv.id)
    expect(loaded?.messages.length).toBe(2)
    expect(loaded?.messages[0].role).toBe('user')
    expect(loaded?.messages[1].role).toBe('assistant')
  })
})
