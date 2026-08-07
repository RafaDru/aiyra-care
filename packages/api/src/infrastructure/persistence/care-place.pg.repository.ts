import type { Pool } from 'pg'
import type { CarePlaceRepository, CarePlaceRow } from '../../domain/care-place/care-place.repository.js'

function rowToData(row: Record<string, unknown>): CarePlaceRow {
  return {
    id: row.id as string,
    displayName: row.display_name as string,
    normalizedName: row.normalized_name as string,
    usageCount: Number(row.usage_count),
    firstSeenAt: row.first_seen_at as Date,
    lastUsedAt: row.last_used_at as Date,
  }
}

export class CarePlacePgRepository implements CarePlaceRepository {
  constructor(private readonly pool: Pool) {}

  async search(query: string, limit = 20): Promise<CarePlaceRow[]> {
    const q = query.trim()
    const params: unknown[] = []
    let where = ''
    if (q) {
      const normalized = q.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ')
      params.push(`%${normalized}%`, `%${q}%`)
      where = 'WHERE normalized_name LIKE $1 OR display_name ILIKE $2'
    }
    params.push(limit)
    const limitIdx = params.length
    const { rows } = await this.pool.query(
      `SELECT id, display_name, normalized_name, usage_count, first_seen_at, last_used_at
       FROM care_places
       ${where}
       ORDER BY usage_count DESC, display_name ASC
       LIMIT $${limitIdx}`,
      params,
    )
    return rows.map(rowToData)
  }

  async upsert(displayName: string, normalizedName: string): Promise<CarePlaceRow> {
    const { rows } = await this.pool.query(
      `INSERT INTO care_places (display_name, normalized_name, usage_count, first_seen_at, last_used_at)
       VALUES ($1, $2, 1, NOW(), NOW())
       ON CONFLICT (normalized_name) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         usage_count = care_places.usage_count + 1,
         last_used_at = NOW()
       RETURNING id, display_name, normalized_name, usage_count, first_seen_at, last_used_at`,
      [displayName, normalizedName],
    )
    return rowToData(rows[0])
  }
}
