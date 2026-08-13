import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AuthProviderPort, AuthUser } from '../../domain/auth/auth-provider.port.js'
import type { AuthIdentityDeletionPort } from '../../domain/auth/auth-identity-deletion.port.js'

export class SupabaseAuthAdapter implements AuthProviderPort, AuthIdentityDeletionPort {
  private readonly client: SupabaseClient

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }

  async verifyAccessToken(accessToken: string): Promise<AuthUser | null> {
    const { data, error } = await this.client.auth.getUser(accessToken)
    if (error || !data.user) return null
    const user = data.user
    const meta = user.user_metadata as Record<string, unknown> | undefined
    const displayName =
      (meta?.full_name as string | undefined)
      ?? (meta?.name as string | undefined)
      ?? user.email
    const avatarUrl = (meta?.avatar_url as string | undefined) ?? (meta?.picture as string | undefined)
    return {
      id: user.id,
      email: user.email,
      displayName,
      avatarUrl,
    }
  }

  async deleteUser(authSubject: string): Promise<void> {
    const { error } = await this.client.auth.admin.deleteUser(authSubject)
    if (error) throw error
  }
}
