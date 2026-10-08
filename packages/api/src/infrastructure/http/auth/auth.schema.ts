import { z } from 'zod'
import { createPatientObjectSchema } from '../patient/patient.schema.js'
import { isAdultBirthDate } from '../../../domain/patient/age-rules.js'

const digitsOnly = (value: string) => value.replace(/\D/g, '')

const optionalSocialName = z
  .string()
  .max(255)
  .optional()
  .or(z.literal('').transform(() => undefined))

const phoneDigitsSchema = z
  .string()
  .transform(digitsOnly)
  .pipe(z.string().regex(/^\d{10,11}$/, 'Telefone celular deve ter 10 ou 11 dígitos'))

const optionalPhoneDigitsSchema = z
  .union([z.string(), z.literal('')])
  .optional()
  .transform((v) => {
    if (v == null || v === '') return undefined
    const d = digitsOnly(v)
    if (!d) return undefined
    return d
  })
  .refine((v) => v === undefined || /^\d{10,11}$/.test(v), { message: 'Telefone inválido' })

export const onboardingAddressSchema = z.object({
  postalCode: z.string().transform(digitsOnly).pipe(z.string().length(8, 'CEP deve ter 8 dígitos')),
  street: z.string().min(1).max(255),
  number: z.string().min(1).max(32),
  complement: z.string().max(120).optional().or(z.literal('').transform(() => undefined)),
  district: z.string().min(1).max(120),
  city: z.string().min(1).max(120),
  state: z.string().length(2).transform((s) => s.toUpperCase()),
})

export const completeProfileSchema = createPatientObjectSchema
  .extend({
    gender: z.enum(['male', 'female']),
    cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos'),
    socialName: optionalSocialName,
    phone: phoneDigitsSchema.optional(),
    phoneSecondary: optionalPhoneDigitsSchema,
    phoneIsWhatsapp: z.boolean().optional(),
    address: onboardingAddressSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (!isAdultBirthDate(data.birthDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'O cadastro é permitido apenas para maiores de 18 anos.',
        path: ['birthDate'],
      })
    }
  })

export type CompleteProfileInput = z.infer<typeof completeProfileSchema>

export const deleteAccountSchema = z.object({
  confirmPhrase: z.literal('EXCLUIR'),
})
