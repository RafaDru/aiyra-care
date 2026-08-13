import { z } from 'zod'
import { createPatientSchema } from '../patient/patient.schema.js'
import { isAdultBirthDate } from '../../../domain/patient/age-rules.js'

export const completeProfileSchema = createPatientSchema
  .extend({
    gender: z.enum(['male', 'female']),
    cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos'),
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
