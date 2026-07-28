import type { Pool } from 'pg'
import type { AuthorizationItemRepository } from '../../domain/authorization/authorization-item.repository.js'
import { AuthorizationItem } from '../../domain/authorization/authorization-item.entity.js'
import type { AuthorizationItemData } from '../../domain/authorization/authorization-item.entity.js'

const COLUMNS = 'id, authorization_id, procedure_code, procedure_description, quantity_requested, quantity_authorized, status, external_procedure_id, sort_order, created_at'

function rowToEntity(row: Record<string, unknown>): AuthorizationItem {
  return AuthorizationItem.restore({
    id: row.id as string,
    authorizationId: row.authorization_id as string,
    procedureCode: row.procedure_code as string | null,
    procedureDescription: row.procedure_description as string,
    quantityRequested: row.quantity_requested != null ? Number(row.quantity_requested) : null,
    quantityAuthorized: row.quantity_authorized != null ? Number(row.quantity_authorized) : null,
    status: row.status as string | null,
    externalProcedureId: row.external_procedure_id as string | null,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at as Date,
  })
}

export class AuthorizationItemPgRepository implements AuthorizationItemRepository {
  constructor(private readonly pool: Pool) {}

  async findByAuthorizationId(authorizationId: string) {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM authorization_items WHERE authorization_id = $1 ORDER BY sort_order ASC, created_at ASC`,
      [authorizationId],
    )
    return rows.map(rowToEntity)
  }

  async replaceForAuthorization(authorizationId: string, items: AuthorizationItem[]) {
    await this.pool.query('DELETE FROM authorization_items WHERE authorization_id = $1', [authorizationId])
    const saved: AuthorizationItem[] = []
    for (const item of items) {
      const { rows } = await this.pool.query(
        `INSERT INTO authorization_items
          (id, authorization_id, procedure_code, procedure_description, quantity_requested, quantity_authorized, status, external_procedure_id, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING ${COLUMNS}`,
        [
          item.id, authorizationId, item.procedureCode, item.procedureDescription,
          item.quantityRequested, item.quantityAuthorized, item.status,
          item.externalProcedureId, item.sortOrder,
        ],
      )
      saved.push(rowToEntity(rows[0]))
    }
    return saved
  }

  async deleteByAuthorizationId(authorizationId: string) {
    await this.pool.query('DELETE FROM authorization_items WHERE authorization_id = $1', [authorizationId])
  }

  static toData(items: AuthorizationItem[]): AuthorizationItemData[] {
    return items.map(i => i.toJSON())
  }
}
