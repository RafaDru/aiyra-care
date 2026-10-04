import type { Pool, PoolClient } from 'pg'

export type OpsReferenceKind = 'incident' | 'defect'

function formatReference(kind: OpsReferenceKind, seq: number): string {
  const prefix = kind === 'incident' ? 'INC' : 'DEF'
  return `${prefix}-${String(seq).padStart(6, '0')}`
}

/** Aloca próximo código humano (transação com lock na linha de sequência). */
export async function allocateOpsReferenceCode(
  db: Pool | PoolClient,
  kind: OpsReferenceKind,
): Promise<string> {
  const res = await db.query<{ next_val: string }>(
    `UPDATE ops_reference_sequences
     SET next_val = next_val + 1
     WHERE kind = $1
     RETURNING (next_val - 1)::text AS next_val`,
    [kind],
  )
  const row = res.rows[0]
  if (!row) {
    throw new Error(`ops_reference_sequences missing kind=${kind}`)
  }
  return formatReference(kind, Number(row.next_val))
}
