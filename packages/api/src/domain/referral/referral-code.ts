import { randomBytes } from 'node:crypto'

const CODE_LEN = 8
const CODE_PATTERN = /^[A-Z0-9]{6,12}$/

export function generateReferralCode(): string {
  return randomBytes(6).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, CODE_LEN).toUpperCase()
}

export function isValidReferralCode(value: string | null | undefined): boolean {
  if (!value) return false
  return CODE_PATTERN.test(value)
}

export function appendReferralToShareUrl(shareUrl: string, referralCode: string | null | undefined): string {
  if (!referralCode || !isValidReferralCode(referralCode)) return shareUrl
  const url = new URL(shareUrl)
  url.searchParams.set('ref', referralCode)
  return url.toString()
}
