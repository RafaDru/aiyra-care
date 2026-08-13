export type PreferredContact = 'email' | 'phone' | 'whatsapp'

export interface AccountProfileProps {
  fullName?: string | null
  phone?: string | null
  phoneSecondary?: string | null
  whatsapp?: string | null
  cpf?: string | null
  birthDate?: Date | null
  gender?: string | null
  city?: string | null
  state?: string | null
  country?: string
  timezone?: string | null
  locale?: string | null
  bio?: string | null
  websiteUrl?: string | null
  linkedinUrl?: string | null
  instagramUrl?: string | null
  xUrl?: string | null
  facebookUrl?: string | null
  preferredContact?: PreferredContact | null
}

export interface AccountProfileData {
  accountId: string
  fullName: string | null
  phone: string | null
  phoneSecondary: string | null
  whatsapp: string | null
  cpf: string | null
  birthDate: Date | null
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
  preferredContact: PreferredContact | null
  createdAt: Date
  updatedAt: Date
}

export class AccountProfile {
  private constructor(private readonly data: AccountProfileData) {}

  static empty(accountId: string): AccountProfile {
    return new AccountProfile({
      accountId,
      fullName: null,
      phone: null,
      phoneSecondary: null,
      whatsapp: null,
      cpf: null,
      birthDate: null,
      gender: null,
      city: null,
      state: null,
      country: 'BR',
      timezone: null,
      locale: null,
      bio: null,
      websiteUrl: null,
      linkedinUrl: null,
      instagramUrl: null,
      xUrl: null,
      facebookUrl: null,
      preferredContact: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static restore(data: AccountProfileData): AccountProfile {
    return new AccountProfile(data)
  }

  get accountId(): string { return this.data.accountId }
  get fullName(): string | null { return this.data.fullName }
  get phone(): string | null { return this.data.phone }
  get phoneSecondary(): string | null { return this.data.phoneSecondary }
  get whatsapp(): string | null { return this.data.whatsapp }
  get cpf(): string | null { return this.data.cpf }
  get birthDate(): Date | null { return this.data.birthDate }
  get gender(): string | null { return this.data.gender }
  get city(): string | null { return this.data.city }
  get state(): string | null { return this.data.state }
  get country(): string { return this.data.country }
  get timezone(): string | null { return this.data.timezone }
  get locale(): string | null { return this.data.locale }
  get bio(): string | null { return this.data.bio }
  get websiteUrl(): string | null { return this.data.websiteUrl }
  get linkedinUrl(): string | null { return this.data.linkedinUrl }
  get instagramUrl(): string | null { return this.data.instagramUrl }
  get xUrl(): string | null { return this.data.xUrl }
  get facebookUrl(): string | null { return this.data.facebookUrl }
  get preferredContact(): PreferredContact | null { return this.data.preferredContact }

  withUpdates(props: Partial<AccountProfileProps>): AccountProfile {
    return AccountProfile.restore({
      ...this.data,
      fullName: props.fullName !== undefined ? props.fullName ?? null : this.data.fullName,
      phone: props.phone !== undefined ? props.phone ?? null : this.data.phone,
      phoneSecondary: props.phoneSecondary !== undefined ? props.phoneSecondary ?? null : this.data.phoneSecondary,
      whatsapp: props.whatsapp !== undefined ? props.whatsapp ?? null : this.data.whatsapp,
      cpf: props.cpf !== undefined ? props.cpf ?? null : this.data.cpf,
      birthDate: props.birthDate !== undefined ? props.birthDate ?? null : this.data.birthDate,
      gender: props.gender !== undefined ? props.gender ?? null : this.data.gender,
      city: props.city !== undefined ? props.city ?? null : this.data.city,
      state: props.state !== undefined ? props.state ?? null : this.data.state,
      country: props.country ?? this.data.country,
      timezone: props.timezone !== undefined ? props.timezone ?? null : this.data.timezone,
      locale: props.locale !== undefined ? props.locale ?? null : this.data.locale,
      bio: props.bio !== undefined ? props.bio ?? null : this.data.bio,
      websiteUrl: props.websiteUrl !== undefined ? props.websiteUrl ?? null : this.data.websiteUrl,
      linkedinUrl: props.linkedinUrl !== undefined ? props.linkedinUrl ?? null : this.data.linkedinUrl,
      instagramUrl: props.instagramUrl !== undefined ? props.instagramUrl ?? null : this.data.instagramUrl,
      xUrl: props.xUrl !== undefined ? props.xUrl ?? null : this.data.xUrl,
      facebookUrl: props.facebookUrl !== undefined ? props.facebookUrl ?? null : this.data.facebookUrl,
      preferredContact: props.preferredContact !== undefined ? props.preferredContact ?? null : this.data.preferredContact,
      updatedAt: new Date(),
    })
  }

  toJSON(): AccountProfileData {
    return { ...this.data }
  }
}
