/** Postgres undefined_table — migration ainda não aplicada no ambiente. */
export function isPgMissingTableError(err: unknown): boolean {
  return (
    err !== null
    && typeof err === 'object'
    && 'code' in err
    && (err as { code?: string }).code === '42P01'
  )
}

/** Postgres undefined_column — migration parcial (ex.: 075 sem 076). */
export function isPgMissingColumnError(err: unknown): boolean {
  return (
    err !== null
    && typeof err === 'object'
    && 'code' in err
    && (err as { code?: string }).code === '42703'
  )
}

export function isPgSchemaOutdatedError(err: unknown): boolean {
  return isPgMissingTableError(err) || isPgMissingColumnError(err)
}

export const CH_SCHEMA_MIGRATION_HINT =
  'Migrations CH pendentes (071–076). Rode: cd packages/api && node scripts/apply-all-migrations.mjs'
