import type { Pool } from 'pg'
import type {
  AvaConversationRepository,
  AvaConversationRow,
  AvaMessageRow,
} from '../../domain/ava/ava-conversation.repository.js'

const CONV_COLS = 'id, account_id, patient_id, health_thread_id, title, status, last_activity_at, created_at, updated_at'
const MSG_COLS = 'id, conversation_id, role, content, document_id, metadata, created_at'

function rowToConversation(row: Record<string, unknown>): AvaConversationRow {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    patientId: row.patient_id as string,
    healthThreadId: row.health_thread_id as string | null,
    title: row.title as string | null,
    status: row.status as AvaConversationRow['status'],
    lastActivityAt: row.last_activity_at as Date,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  }
}

function rowToMessage(row: Record<string, unknown>): AvaMessageRow {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    role: row.role as AvaMessageRow['role'],
    content: row.content as string,
    documentId: row.document_id as string | null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.created_at as Date,
  }
}

export class AvaConversationPgRepository implements AvaConversationRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string) {
    const { rows } = await this.pool.query(
      `SELECT ${CONV_COLS} FROM ava_conversations WHERE id = $1`,
      [id],
    )
    return rows.length ? rowToConversation(rows[0]) : null
  }

  async listByAccount(accountId: string, patientId?: string) {
    const params: unknown[] = [accountId]
    let where = 'account_id = $1'
    if (patientId) {
      where += ` AND patient_id = $${params.push(patientId)}`
    }
    const { rows } = await this.pool.query(
      `SELECT ${CONV_COLS} FROM ava_conversations
       WHERE ${where} AND status = 'active'
       ORDER BY last_activity_at DESC
       LIMIT 50`,
      params,
    )
    return rows.map(rowToConversation)
  }

  async listAllByAccount(accountId: string) {
    const { rows } = await this.pool.query(
      `SELECT ${CONV_COLS} FROM ava_conversations
       WHERE account_id = $1
       ORDER BY last_activity_at DESC`,
      [accountId],
    )
    return rows.map(rowToConversation)
  }
    accountId: string
    patientId: string
    healthThreadId?: string | null
    title?: string | null
  }) {
    const { rows } = await this.pool.query(
      `INSERT INTO ava_conversations (account_id, patient_id, health_thread_id, title)
       VALUES ($1, $2, $3, $4)
       RETURNING ${CONV_COLS}`,
      [input.accountId, input.patientId, input.healthThreadId ?? null, input.title ?? null],
    )
    return rowToConversation(rows[0])
  }

  async touchActivity(id: string, title?: string | null) {
    if (title) {
      await this.pool.query(
        `UPDATE ava_conversations
         SET last_activity_at = NOW(), updated_at = NOW(), title = COALESCE(title, $2)
         WHERE id = $1`,
        [id, title],
      )
      return
    }
    await this.pool.query(
      `UPDATE ava_conversations SET last_activity_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id],
    )
  }

  async listMessages(conversationId: string, limit = 50) {
    const { rows } = await this.pool.query(
      `SELECT ${MSG_COLS} FROM ava_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [conversationId, limit],
    )
    return rows.map(rowToMessage)
  }

  async appendMessage(input: {
    conversationId: string
    role: AvaMessageRow['role']
    content: string
    documentId?: string | null
    metadata?: Record<string, unknown> | null
  }) {
    const { rows } = await this.pool.query(
      `INSERT INTO ava_messages (conversation_id, role, content, document_id, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING ${MSG_COLS}`,
      [
        input.conversationId,
        input.role,
        input.content,
        input.documentId ?? null,
        input.metadata ? JSON.stringify(input.metadata) : null,
      ],
    )
    return rowToMessage(rows[0])
  }

  async updateStatus(id: string, status: AvaConversationRow['status']) {
    await this.pool.query(
      `UPDATE ava_conversations SET status = $2, updated_at = NOW() WHERE id = $1`,
      [id, status],
    )
  }

  async deleteById(id: string) {
    await this.pool.query(`DELETE FROM ava_conversations WHERE id = $1`, [id])
  }
}
