import type { Pool } from 'pg'
import type { PreferredContact, AccountProfileProps } from '../../domain/account-profile/account-profile.entity.js'
import { AccountProfile } from '../../domain/account-profile/account-profile.entity.js'
import type { AccountProfileRepository } from '../../domain/account-profile/account-profile.repository.js'

const COLS = `
  account_id, full_name, phone, phone_secondary, whatsapp, cpf, birth_date, gender,
  city, state, country, timezone, locale, bio, website_url, linkedin_url,
  instagram_url, x_url, facebook_url, preferred_contact, created_at, updated_at
`

function mapRow(row: Record<string, unknown>): AccountProfile {
  return AccountProfile.restore({
    accountId: String(row.account_id),
    fullName: row.full_name != null ? String(row.full_name) : null,
    phone: row.phone != null ? String(row.phone) : null,
    phoneSecondary: row.phone_secondary != null ? String(row.phone_secondary) : null,
    whatsapp: row.whatsapp != null ? String(row.whatsapp) : null,
    cpf: row.cpf != null ? String(row.cpf) : null,
    birthDate: row.birth_date ? new Date(row.birth_date as string | Date) : null,
    gender: row.gender != null ? String(row.gender) : null,
    city: row.city != null ? String(row.city) : null,
    state: row.state != null ? String(row.state) : null,
    country: String(row.country ?? 'BR'),
    timezone: row.timezone != null ? String(row.timezone) : null,
    locale: row.locale != null ? String(row.locale) : null,
    bio: row.bio != null ? String(row.bio) : null,
    websiteUrl: row.website_url != null ? String(row.website_url) : null,
    linkedinUrl: row.linkedin_url != null ? String(row.linkedin_url) : null,
    instagramUrl: row.instagram_url != null ? String(row.instagram_url) : null,
    xUrl: row.x_url != null ? String(row.x_url) : null,
    facebookUrl: row.facebook_url != null ? String(row.facebook_url) : null,
    preferredContact: row.preferred_contact != null
      ? row.preferred_contact as PreferredContact
      : null,
    createdAt: new Date(row.created_at as string | Date),
    updatedAt: new Date(row.updated_at as string | Date),
  })
}

export class AccountProfilePgRepository implements AccountProfileRepository {
  constructor(private readonly pool: Pool) {}

  async findByAccountId(accountId: string): Promise<AccountProfile | null> {
    const { rows } = await this.pool.query(`SELECT ${COLS} FROM account_profiles WHERE account_id = $1`, [accountId])
    return rows[0] ? mapRow(rows[0]) : null
  }

  async upsert(accountId: string, props: AccountProfileProps): Promise<AccountProfile> {
    const { rows } = await this.pool.query(
      `INSERT INTO account_profiles (
         account_id, full_name, phone, phone_secondary, whatsapp, cpf, birth_date, gender,
         city, state, country, timezone, locale, bio, website_url, linkedin_url,
         instagram_url, x_url, facebook_url, preferred_contact
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
       )
       ON CONFLICT (account_id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         phone = EXCLUDED.phone,
         phone_secondary = EXCLUDED.phone_secondary,
         whatsapp = EXCLUDED.whatsapp,
         cpf = EXCLUDED.cpf,
         birth_date = EXCLUDED.birth_date,
         gender = EXCLUDED.gender,
         city = EXCLUDED.city,
         state = EXCLUDED.state,
         country = EXCLUDED.country,
         timezone = EXCLUDED.timezone,
         locale = EXCLUDED.locale,
         bio = EXCLUDED.bio,
         website_url = EXCLUDED.website_url,
         linkedin_url = EXCLUDED.linkedin_url,
         instagram_url = EXCLUDED.instagram_url,
         x_url = EXCLUDED.x_url,
         facebook_url = EXCLUDED.facebook_url,
         preferred_contact = EXCLUDED.preferred_contact,
         updated_at = NOW()
       RETURNING ${COLS}`,
      [
        accountId,
        props.fullName ?? null,
        props.phone ?? null,
        props.phoneSecondary ?? null,
        props.whatsapp ?? null,
        props.cpf ?? null,
        props.birthDate ? props.birthDate.toISOString().slice(0, 10) : null,
        props.gender ?? null,
        props.city ?? null,
        props.state?.toUpperCase() ?? null,
        props.country?.toUpperCase() ?? 'BR',
        props.timezone ?? null,
        props.locale ?? null,
        props.bio ?? null,
        props.websiteUrl ?? null,
        props.linkedinUrl ?? null,
        props.instagramUrl ?? null,
        props.xUrl ?? null,
        props.facebookUrl ?? null,
        props.preferredContact ?? null,
      ],
    )
    return mapRow(rows[0])
  }
}
