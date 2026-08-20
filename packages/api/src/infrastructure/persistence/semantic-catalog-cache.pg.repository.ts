import type { Pool } from 'pg'
import type {
  SemanticCacheEntry,
  SemanticCacheRepositoryPort,
} from '../../domain/semantic-classification/semantic-classification.types.js'

function rowToEntity<TKind = string, TDest = string>(
  row: Record<string, unknown>,
): SemanticCacheEntry<TKind, TDest> {
  return {
    id: row.id as string,
    domain: row.domain as string,
    rawLabel: row.raw_label as string,
    normalizedLabel: row.normalized_label as string,
    kind: row.kind as TKind,
    destination: row.destination as TDest,
    canonicalName: (row.canonical_name as string | null) ?? undefined,
    catalogId: (row.catalog_id as string | null) ?? undefined,
    confidence: Number(row.confidence),
    sourceMethod: row.source_method as 'llm' | 'manual' | 'vector',
    timesHit: Number(row.times_hit),
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  }
}

export class SemanticCatalogCachePgRepository implements SemanticCacheRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async findByNormalizedLabel<TKind = string, TDest = string>(
    domain: string,
    normalizedLabel: string,
  ): Promise<SemanticCacheEntry<TKind, TDest> | null> {
    const { rows } = await this.pool.query(
      `SELECT id, domain, raw_label, normalized_label, kind, destination,
              canonical_name, catalog_id, confidence, source_method, times_hit,
              created_at, updated_at
         FROM semantic_catalog_cache
        WHERE domain = $1 AND normalized_label = $2
        LIMIT 1`,
      [domain, normalizedLabel],
    )

    if (!rows.length) return null

    // Incrementa contador de uso de forma assíncrona/segura
    this.pool
      .query(
        `UPDATE semantic_catalog_cache SET times_hit = times_hit + 1, updated_at = NOW() WHERE id = $1`,
        [rows[0].id],
      )
      .catch(() => {})

    return rowToEntity<TKind, TDest>(rows[0])
  }

  async saveOrIncrement<TKind = string, TDest = string>(
    entry: Omit<SemanticCacheEntry<TKind, TDest>, 'id' | 'timesHit' | 'createdAt' | 'updatedAt'>,
  ): Promise<SemanticCacheEntry<TKind, TDest>> {
    const { rows } = await this.pool.query(
      `INSERT INTO semantic_catalog_cache (
         domain, raw_label, normalized_label, kind, destination,
         canonical_name, catalog_id, confidence, source_method
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (domain, normalized_label)
       DO UPDATE SET
         times_hit = semantic_catalog_cache.times_hit + 1,
         confidence = EXCLUDED.confidence,
         source_method = EXCLUDED.source_method,
         updated_at = NOW()
       RETURNING id, domain, raw_label, normalized_label, kind, destination,
                 canonical_name, catalog_id, confidence, source_method, times_hit,
                 created_at, updated_at`,
      [
        entry.domain,
        entry.rawLabel,
        entry.normalizedLabel,
        String(entry.kind),
        String(entry.destination),
        entry.canonicalName ?? null,
        entry.catalogId ?? null,
        entry.confidence,
        entry.sourceMethod,
      ],
    )

    return rowToEntity<TKind, TDest>(rows[0])
  }

  async findAllByDomain<TKind = string, TDest = string>(
    domain: string,
  ): Promise<Array<SemanticCacheEntry<TKind, TDest>>> {
    const { rows } = await this.pool.query(
      `SELECT id, domain, raw_label, normalized_label, kind, destination,
              canonical_name, catalog_id, confidence, source_method, times_hit,
              created_at, updated_at
         FROM semantic_catalog_cache
        WHERE domain = $1
        ORDER BY times_hit DESC, updated_at DESC`,
      [domain],
    )

    return rows.map((r) => rowToEntity<TKind, TDest>(r))
  }
}
