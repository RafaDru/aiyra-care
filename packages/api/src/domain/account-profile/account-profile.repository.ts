import type { AccountProfile, AccountProfileProps } from './account-profile.entity.js'

export interface AccountProfileRepository {
  findByAccountId(accountId: string): Promise<AccountProfile | null>
  upsert(accountId: string, props: AccountProfileProps): Promise<AccountProfile>
}
