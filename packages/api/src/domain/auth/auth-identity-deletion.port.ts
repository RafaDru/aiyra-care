/** Porta: remoção do usuário no provedor de identidade (Supabase Auth). */
export interface AuthIdentityDeletionPort {
  deleteUser(authSubject: string): Promise<void>
}
