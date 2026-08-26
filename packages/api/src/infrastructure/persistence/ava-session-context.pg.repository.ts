import type { Pool } from 'pg'
import type {
  AvaSessionContextRepository,
  AvaSessionPinRow,
} from '../../domain/ava/ava-session-context.repository.js'

const COLS = 'id, conversation_id, entity_type, entity_id, patient_id, label, source, active, created_at, updated_at'

function rowToPin(row: Record<string, unknown>): AvaSessionPinRow {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    entityType: row.entity_type as AvaSessionPinRow['entityType'],
    entityId: row.entity_id as string,
    patientId: row.patient_id as string,
    label: row.label as string | null,
    source: row.source as AvaSessionPinRow['source'],
    active: Boolean(row.active),
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  }
}

export class AvaSessionContextPgRepository implements AvaSessionContextRepository {
  constructor(private readonly pool: Pool) {}

  async listActive(conversationId: string) {
    const { rows } = await this.pool.query(
      `SELECT ${COLS} FROM ava_session_context
       WHERE conversation_id = $1 AND active = TRUE
       ORDER BY created_at ASC`,
      [conversationId],
    )
    return rows.map(rowToPin)
  }

  async upsertPin(input: {
    conversationId: string
    entityType: AvaSessionPinRow['entityType']
    entityId: string
    patientId: string
    label?: string | null
    source: AvaSessionPinRow['source']
  }) {
    const { rows } = await this.pool.query(
      `INSERT INTO ava_session_context
         (conversation_id, entity_type, entity_id, patient_id, label, source, active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       ON CONFLICT (conversation_id, entity_type, entity_id)
       DO UPDATE SET
         patient_id = EXCLUDED.patient_id,
         label = COALESCE(EXCLUDED.label, ava_session_context.label),
         source = EXCLUDED.source,
         active = TRUE,
         updated_at = NOW()
       RETURNING ${COLS}`,
      [
        input.conversationId,
        input.entityType,
        input.entityId,
        input.patientId,
        input.label ?? null,
        input.source,
      ],
    )
    return rowToPin(rows[0])
  }

  async deactivatePin(conversationId: string, entityType: AvaSessionPinRow['entityType'], entityId: string) {
    await this.pool.query(
      `UPDATE ava_session_context
       SET active = FALSE, updated_at = NOW()
       WHERE conversation_id = $1 AND entity_type = $2 AND entity_id = $3`,
      [conversationId, entityType, entityId],
    )
  }

  async deactivateAll(conversationId: string) {
    await this.pool.query(
      `UPDATE ava_session_context SET active = FALSE, updated_at = NOW() WHERE conversation_id = $1`,
      [conversationId],
    )
  }
}
