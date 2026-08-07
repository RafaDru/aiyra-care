import { z } from 'zod'

const genderEnum = z.enum(['male', 'female'])
const bloodTypeEnum = z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])

export const createPatientSchema = z.object({
  name: z.string().min(1).max(255),
  birthDate: z.coerce.date(),
  gender: genderEnum.optional(),
  bloodType: bloodTypeEnum.optional(),
  weightKg: z.number().positive().max(999.99).optional(),
  heightCm: z.number().positive().max(999.99).optional(),
  photoUrl: z.string().url().optional(),
  parentIds: z.array(z.string().uuid()).optional(),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos').optional(),
  cns: z.string().optional(),
})

export const updatePatientSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  birthDate: z.coerce.date().optional(),
  gender: genderEnum.optional(),
  bloodType: bloodTypeEnum.optional(),
  weightKg: z.number().positive().max(999.99).optional(),
  heightCm: z.number().positive().max(999.99).optional(),
  photoUrl: z.string().url().optional(),
  parentIds: z.array(z.string().uuid()).optional(),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos').optional(),
  cns: z.string().optional(),
})

export const patientParamsSchema = z.object({
  id: z.string().uuid(),
})

const patientTimelineKindEnum = z.enum([
  'consultation',
  'extrato',
  'exam',
  'vaccine',
  'authorization',
  'medication_start',
  'thread_note',
])

export const patientContextQuerySchema = z.object({
  timelineMonths: z.coerce.number().int().min(1).max(120).optional(),
})

export const patientTimelineQuerySchema = z.object({
  timelineMonths: z.coerce.number().int().min(1).max(120).optional(),
  kinds: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',').map((k) => k.trim()).filter(Boolean) : undefined))
    .pipe(z.array(patientTimelineKindEnum).optional()),
  sources: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',').map((k) => k.trim()).filter(Boolean) : undefined)),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export type CreatePatientInput = z.infer<typeof createPatientSchema>
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>
