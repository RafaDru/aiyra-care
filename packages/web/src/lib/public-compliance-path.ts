function apiPathBase(path: string): string {
  return path.split('?')[0]
}

/** Mirrors API `security.plugin` — anonymous requests allowed (public legal pages). */
export function isPublicCompliancePath(path: string): boolean {
  const base = apiPathBase(path)
  if (base === '/compliance/documents' || base === '/compliance/contact' || base === '/compliance/go-live-status') {
    return true
  }
  return /^\/compliance\/documents\/[a-z_]+\/current$/.test(base)
}
