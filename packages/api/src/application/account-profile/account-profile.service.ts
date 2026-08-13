import type { AppAccountRepository } from '../../domain/auth/app-account.repository.js'
import { AppAccount } from '../../domain/auth/app-account.entity.js'
import type { AccountProfileRepository } from '../../domain/account-profile/account-profile.repository.js'
import { AccountProfile } from '../../domain/account-profile/account-profile.entity.js'
import type { AccountProfileProps } from '../../domain/account-profile/account-profile.entity.js'

export interface AccountProfileView {
  accountId: string
  email: string | null
  displayName: string | null
  avatarUrl: string | null
  profile: {
    fullName: string | null
    phone: string | null
    phoneSecondary: string | null
    whatsapp: string | null
    cpf: string | null
    birthDate: string | null
    gender: string | null
    city: string | null
    state: string | null
    country: string
    timezone: string | null
    locale: string | null
    bio: string | null
    websiteUrl: string | null
    linkedinUrl: string | null
    instagramUrl: string | null
    xUrl: string | null
    facebookUrl: string | null
    preferredContact: string | null
    updatedAt: string | null
  }
}

function profileToView(profile: AccountProfile): AccountProfileView['profile'] {
  const d = profile.toJSON()
  return {
    fullName: d.fullName,
    phone: d.phone,
    phoneSecondary: d.phoneSecondary,
    whatsapp: d.whatsapp,
    cpf: d.cpf,
    birthDate: d.birthDate ? d.birthDate.toISOString().slice(0, 10) : null,
    gender: d.gender,
    city: d.city,
    state: d.state,
    country: d.country,
    timezone: d.timezone,
    locale: d.locale,
    bio: d.bio,
    websiteUrl: d.websiteUrl,
    linkedinUrl: d.linkedinUrl,
    instagramUrl: d.instagramUrl,
    xUrl: d.xUrl,
    facebookUrl: d.facebookUrl,
    preferredContact: d.preferredContact,
    updatedAt: d.updatedAt.toISOString(),
  }
}

export class AccountProfileService {
  constructor(
    private readonly accounts: AppAccountRepository,
    private readonly profiles: AccountProfileRepository,
  ) {}

  async getProfile(accountId: string): Promise<AccountProfileView | null> {
    const account = await this.accounts.findById(accountId)
    if (!account) return null

    const profile = await this.profiles.findByAccountId(accountId)
    const empty = profile ?? AccountProfile.empty(accountId)

    return {
      accountId: account.id,
      email: account.email,
      displayName: account.displayName,
      avatarUrl: account.avatarUrl,
      profile: profileToView(empty),
    }
  }

  async updateProfile(accountId: string, input: AccountProfileProps): Promise<AccountProfileView> {
    const account = await this.accounts.findById(accountId)
    if (!account) throw new Error('Conta não encontrada')

    const saved = await this.profiles.upsert(accountId, input)

    if (input.fullName?.trim()) {
      const updated = AppAccount.restore({
        ...account.toJSON(),
        displayName: input.fullName.trim(),
        updatedAt: new Date(),
      })
      await this.accounts.update(updated)
    }

    const view = await this.getProfile(accountId)
    if (!view) throw new Error('Perfil não encontrado após atualização')
    return view
  }
}
