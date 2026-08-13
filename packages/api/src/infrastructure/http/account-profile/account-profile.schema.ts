import { z } from 'zod'

const optionalUrl = z.string().url().optional().or(z.literal('').transform(() => undefined))
const optionalPhone = z.string().max(30).optional().or(z.literal('').transform(() => undefined))
const optionalText = z.string().max(2000).optional().or(z.literal('').transform(() => undefined))

export const updateAccountProfileSchema = z.object({
  fullName: z.string().min(2).max(255).optional().or(z.literal('').transform(() => undefined)),
  phone: optionalPhone,
  phoneSecondary: optionalPhone,
  whatsapp: optionalPhone,
  cpf: z.string().regex(/^\d{11}$/).optional().or(z.literal('').transform(() => undefined)),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('').transform(() => undefined)),
  gender: z.enum(['male', 'female', 'other', 'prefer_not']).optional().or(z.literal('').transform(() => undefined)),
  city: z.string().max(120).optional().or(z.literal('').transform(() => undefined)),
  state: z.string().length(2).optional().or(z.literal('').transform(() => undefined)),
  country: z.string().length(2).optional(),
  timezone: z.string().max(64).optional().or(z.literal('').transform(() => undefined)),
  locale: z.string().max(10).optional().or(z.literal('').transform(() => undefined)),
  bio: optionalText,
  websiteUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  instagramUrl: optionalUrl,
  xUrl: optionalUrl,
  facebookUrl: optionalUrl,
  preferredContact: z.enum(['email', 'phone', 'whatsapp']).optional().or(z.literal('').transform(() => undefined)),
})

export type UpdateAccountProfileInput = z.infer<typeof updateAccountProfileSchema>

export function toProfileProps(input: UpdateAccountProfileInput) {
  return {
    fullName: input.fullName,
    phone: input.phone,
    phoneSecondary: input.phoneSecondary,
    whatsapp: input.whatsapp,
    cpf: input.cpf,
    birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
    gender: input.gender,
    city: input.city,
    state: input.state,
    country: input.country,
    timezone: input.timezone,
    locale: input.locale,
    bio: input.bio,
    websiteUrl: input.websiteUrl,
    linkedinUrl: input.linkedinUrl,
    instagramUrl: input.instagramUrl,
    xUrl: input.xUrl,
    facebookUrl: input.facebookUrl,
    preferredContact: input.preferredContact,
  }
}
