import type { AuthenticatedRequest } from '../auth/auth.middleware.js'
import { handwritingScopeId } from '../../../domain/document/handwriting-policy.js'

/** Créditos de manuscrito por conta autenticada; fallback env/default para dev sem auth. */
export function resolveHandwritingScopeId(req: AuthenticatedRequest): string {
  if (req.accountId) return req.accountId
  return handwritingScopeId()
}
