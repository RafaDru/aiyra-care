import type { Pool } from 'pg'
import { generateReferralCode, isValidReferralCode } from '../../domain/referral/referral-code.js'

export class ReferralCodeService {
  constructor(private readonly pool: Pool) {}

  async getOrCreate(accountId: string): Promise<string> {
    const existing = await this.pool.query<{ referral_code: string | null }>(
      `SELECT referral_code FROM app_accounts WHERE id = $1`,
      [accountId],
    )
    const code = existing.rows[0]?.referral_code
    if (code && isValidReferralCode(code)) return code

    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = generateReferralCode()
      const updated = await this.pool.query<{ referral_code: string }>(
        `UPDATE app_accounts
         SET referral_code = $1
         WHERE id = $2 AND (referral_code IS NULL OR referral_code = '')
         RETURNING referral_code`,
        [candidate, accountId],
      )
      if (updated.rows[0]?.referral_code) return updated.rows[0].referral_code

      const reread = await this.pool.query<{ referral_code: string }>(
        `SELECT referral_code FROM app_accounts WHERE id = $1`,
        [accountId],
      )
      if (reread.rows[0]?.referral_code) return reread.rows[0].referral_code
    }

    throw new Error('referral_code_generation_failed')
  }
}
