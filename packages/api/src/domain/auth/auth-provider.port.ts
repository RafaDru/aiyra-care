export interface AuthUser {
  id: string
  email?: string | null
  displayName?: string | null
  avatarUrl?: string | null
}

/** Porta hexagonal: validação de token e perfil do provedor de identidade. */
export interface AuthProviderPort {
  verifyAccessToken(accessToken: string): Promise<AuthUser | null>
}
