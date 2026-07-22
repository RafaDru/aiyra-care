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
})

export const updatePatientSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  birthDate: z.coerce.date().optional(),
  gender: genderEnum.optional(),
  bloodType: bloodTypeEnum.optional(),
  weightKg: z.number().positive().max(999.99).optional(),
  heightCm: z.number().positive().max(999.99).optional(),
  photoUrl: z.string().url().optional(),
})

export const patientParamsSchema = z.object({
  id: z.string().uuid(),
})

export type CreatePatientInput = z.infer<typeof createPatientSchema>
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>
