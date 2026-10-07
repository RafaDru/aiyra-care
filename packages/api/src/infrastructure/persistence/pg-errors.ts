export function isPostgresUniqueViolation(
  error: unknown,
  constraint?: string,
): boolean {
  if (!error || typeof error !== 'object') return false
  const pg = error as { code?: string; constraint?: string }
  if (pg.code !== '23505') return false
  if (!constraint) return true
  return pg.constraint === constraint
}
