import type { Pool } from 'pg'
import type { LegalDocumentKind } from '../../domain/legal-compliance/legal-document-kind.js'
import { isLegalDocumentKind } from '../../domain/legal-compliance/legal-document-kind.js'
import { LegalDocument } from '../../domain/legal-compliance/legal-document.entity.js'
import type { LegalDocumentRepository, LegalDocumentSeedInput } from '../../domain/legal-compliance/legal-document.repository.js'
import { LegalAcceptance } from '../../domain/legal-compliance/legal-acceptance.entity.js'
import type { LegalAcceptanceRepository, RecordAcceptanceInput } from '../../domain/legal-compliance/legal-acceptance.repository.js'

function mapDocument(row: Record<string, unknown>): LegalDocument {
  const kind = String(row.kind)
  if (!isLegalDocumentKind(kind)) throw new Error(`kind legal inválido: ${kind}`)
  return LegalDocument.restore({
    id: String(row.id),
    kind,
    version: String(row.version),
    title: String(row.title),
    summary: row.summary != null ? String(row.summary) : null,
    contentPath: String(row.content_path),
    contentSha256: String(row.content_sha256),
    effectiveAt: new Date(row.effective_at as string | Date),
    publishedAt: new Date(row.published_at as string | Date),
    isCurrent: Boolean(row.is_current),
    requiresAcceptance: Boolean(row.requires_acceptance),
    createdAt: new Date(row.created_at as string | Date),
  })
}

function mapAcceptance(row: Record<string, unknown>): LegalAcceptance {
  const kind = String(row.document_kind)
  if (!isLegalDocumentKind(kind)) throw new Error(`kind legal inválido: ${kind}`)
  return LegalAcceptance.restore({
    id: String(row.id),
    accountId: String(row.account_id),
    documentId: String(row.document_id),
    documentKind: kind,
    documentVersion: String(row.document_version),
    contentSha256: String(row.content_sha256),
    acceptedAt: new Date(row.accepted_at as string | Date),
    acceptanceIp: row.acceptance_ip != null ? String(row.acceptance_ip) : null,
    userAgent: row.user_agent != null ? String(row.user_agent) : null,
  })
}

export class LegalDocumentPgRepository implements LegalDocumentRepository {
  constructor(private readonly pool: Pool) {}

  async findCurrentByKind(kind: LegalDocumentKind): Promise<LegalDocument | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM legal_documents WHERE kind = $1 AND is_current = true LIMIT 1`,
      [kind],
    )
    return rows[0] ? mapDocument(rows[0]) : null
  }

  async listCurrent(): Promise<LegalDocument[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM legal_documents WHERE is_current = true ORDER BY kind`,
    )
    return rows.map(mapDocument)
  }

  async findById(id: string): Promise<LegalDocument | null> {
    const { rows } = await this.pool.query(`SELECT * FROM legal_documents WHERE id = $1`, [id])
    return rows[0] ? mapDocument(rows[0]) : null
  }

  async publishAsCurrent(input: LegalDocumentSeedInput): Promise<LegalDocument> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `UPDATE legal_documents SET is_current = false WHERE kind = $1 AND is_current = true`,
        [input.kind],
      )
      const { rows } = await client.query(
        `INSERT INTO legal_documents (
           kind, version, title, summary, content_path, content_sha256,
           effective_at, is_current, requires_acceptance
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
         ON CONFLICT (kind, version) DO UPDATE SET
           title = EXCLUDED.title,
           summary = EXCLUDED.summary,
           content_path = EXCLUDED.content_path,
           content_sha256 = EXCLUDED.content_sha256,
           effective_at = EXCLUDED.effective_at,
           is_current = true,
           requires_acceptance = EXCLUDED.requires_acceptance,
           published_at = NOW()
         RETURNING *`,
        [
          input.kind,
          input.version,
          input.title,
          input.summary ?? null,
          input.contentPath,
          input.contentSha256,
          input.effectiveAt.toISOString(),
          input.requiresAcceptance ?? true,
        ],
      )
      await client.query('COMMIT')
      return mapDocument(rows[0])
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  }
}

export class LegalAcceptancePgRepository implements LegalAcceptanceRepository {
  constructor(private readonly pool: Pool) {}

  async findByAccount(accountId: string): Promise<LegalAcceptance[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM legal_document_acceptances WHERE account_id = $1 ORDER BY accepted_at DESC`,
      [accountId],
    )
    return rows.map(mapAcceptance)
  }

  async findByAccountAndDocument(accountId: string, documentId: string): Promise<LegalAcceptance | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM legal_document_acceptances WHERE account_id = $1 AND document_id = $2`,
      [accountId, documentId],
    )
    return rows[0] ? mapAcceptance(rows[0]) : null
  }

  async record(input: RecordAcceptanceInput): Promise<LegalAcceptance> {
    const { rows } = await this.pool.query(
      `INSERT INTO legal_document_acceptances (
         account_id, document_id, document_kind, document_version, content_sha256,
         acceptance_ip, user_agent
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (account_id, document_id) DO NOTHING
       RETURNING *`,
      [
        input.accountId,
        input.documentId,
        input.documentKind,
        input.documentVersion,
        input.contentSha256,
        input.acceptanceIp ?? null,
        input.userAgent ?? null,
      ],
    )
    if (rows[0]) return mapAcceptance(rows[0])
    const existing = await this.findByAccountAndDocument(input.accountId, input.documentId)
    if (!existing) throw new Error('Falha ao registrar aceite legal')
    return existing
  }
}
