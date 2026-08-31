/** Postgres undefined_table — migration ainda não aplicada no ambiente. */
export function isPgMissingTableError(err: unknown): boolean {
  return (
    err !== null
    && typeof err === 'object'
    && 'code' in err
    && (err as { code?: string }).code === '42P01'
  )
}
