import type { AvaConversationRepository } from '../../domain/ava/ava-conversation.repository.js'

const TITLE_MAX = 80

export function avaConversationTitleFromMessage(message: string): string {
  const trimmed = message.trim().replace(/\s+/g, ' ')
  if (!trimmed) return 'Conversa Ava'
  return trimmed.length <= TITLE_MAX ? trimmed : `${trimmed.slice(0, TITLE_MAX - 1)}…`
}

export class AvaConversationService {
  constructor(private readonly repo: AvaConversationRepository) {}

  async listForAccount(accountId: string, patientId?: string) {
    return this.repo.listByAccount(accountId, patientId)
  }

  async getForAccount(accountId: string, conversationId: string) {
    const conv = await this.repo.findById(conversationId)
    if (!conv || conv.accountId !== accountId) return null
    return conv
  }

  async create(accountId: string, input: {
    patientId: string
    healthThreadId?: string
    title?: string
  }) {
    return this.repo.create({
      accountId,
      patientId: input.patientId,
      healthThreadId: input.healthThreadId ?? null,
      title: input.title ?? null,
    })
  }

  async getMessages(accountId: string, conversationId: string) {
    const conv = await this.getForAccount(accountId, conversationId)
    if (!conv) return null
    const messages = await this.repo.listMessages(conversationId, 100)
    return { conversation: conv, messages }
  }

  async ensureConversation(
    accountId: string,
    input: {
      patientId: string
      conversationId?: string
      healthThreadId?: string
      firstMessage?: string
    },
  ) {
    if (input.conversationId) {
      const existing = await this.getForAccount(accountId, input.conversationId)
      if (!existing) throw new Error('AVA_CONVERSATION_NOT_FOUND')
      if (existing.patientId !== input.patientId) throw new Error('AVA_CONVERSATION_PATIENT_MISMATCH')
      return existing
    }
    const title = input.firstMessage ? avaConversationTitleFromMessage(input.firstMessage) : null
    return this.repo.create({
      accountId,
      patientId: input.patientId,
      healthThreadId: input.healthThreadId ?? null,
      title,
    })
  }

  async persistTurn(
    accountId: string,
    input: {
      conversationId: string
      userMessage: string
      assistantMessage: string
      attachmentDocumentId?: string
      reflection?: Record<string, unknown>
    },
  ) {
    const conv = await this.getForAccount(accountId, input.conversationId)
    if (!conv) throw new Error('AVA_CONVERSATION_NOT_FOUND')

    const title = conv.title ? null : avaConversationTitleFromMessage(input.userMessage)
    await this.repo.appendMessage({
      conversationId: input.conversationId,
      role: 'user',
      content: input.userMessage,
      documentId: input.attachmentDocumentId ?? null,
    })
    await this.repo.appendMessage({
      conversationId: input.conversationId,
      role: 'assistant',
      content: input.assistantMessage,
      metadata: input.reflection ? { reflection: input.reflection } : null,
    })
    await this.repo.touchActivity(input.conversationId, title)
  }

  async archive(accountId: string, conversationId: string) {
    const conv = await this.getForAccount(accountId, conversationId)
    if (!conv) throw new Error('AVA_CONVERSATION_NOT_FOUND')
    await this.repo.updateStatus(conversationId, 'archived')
    return { ...conv, status: 'archived' as const }
  }

  async delete(accountId: string, conversationId: string) {
    const conv = await this.getForAccount(accountId, conversationId)
    if (!conv) throw new Error('AVA_CONVERSATION_NOT_FOUND')
    await this.repo.deleteById(conversationId)
    return { deleted: true, conversationId }
  }

  async exportForAccount(accountId: string) {
    const conversations = await this.repo.listAllByAccount(accountId)
    return Promise.all(conversations.map(async (conv) => ({
      conversation: conv,
      messages: await this.repo.listMessages(conv.id, 500),
    })))
  }
}
