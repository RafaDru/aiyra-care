export type AvaConversationStatus = 'active' | 'archived'
export type AvaMessageRole = 'user' | 'assistant'

export interface AvaConversationRow {
  id: string
  accountId: string
  patientId: string
  healthThreadId: string | null
  title: string | null
  status: AvaConversationStatus
  lastActivityAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface AvaMessageRow {
  id: string
  conversationId: string
  role: AvaMessageRole
  content: string
  documentId: string | null
  metadata: Record<string, unknown> | null
  createdAt: Date
}

export interface AvaConversationRepository {
  findById(id: string): Promise<AvaConversationRow | null>
  listByAccount(accountId: string, patientId?: string): Promise<AvaConversationRow[]>
  listAllByAccount(accountId: string): Promise<AvaConversationRow[]>
  create(input: {
    accountId: string
    patientId: string
    healthThreadId?: string | null
    title?: string | null
  }): Promise<AvaConversationRow>
  touchActivity(id: string, title?: string | null): Promise<void>
  listMessages(conversationId: string, limit?: number): Promise<AvaMessageRow[]>
  appendMessage(input: {
    conversationId: string
    role: AvaMessageRole
    content: string
    documentId?: string | null
    metadata?: Record<string, unknown> | null
  }): Promise<AvaMessageRow>
  updateStatus(id: string, status: AvaConversationStatus): Promise<void>
  deleteById(id: string): Promise<void>
}
