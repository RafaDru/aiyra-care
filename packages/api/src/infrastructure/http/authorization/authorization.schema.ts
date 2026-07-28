import { z } from 'zod'

const locationSchema = z.object({
  formattedAddress: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
})

const historySchema = z.object({
  code: z.string().optional(),
  description: z.string().optional(),
  occurredAt: z.string().optional(),
  auditorName: z.string().optional(),
})

export const createAuthorizationSchema = z.object({
  patientId: z.string().uuid(),
  procedureCode: z.string().max(50).optional(),
  procedureDescription: z.string().max(500).optional(),
  doctorName: z.string().max(255).optional(),
  doctorCouncil: z.string().max(100).optional(),
  clinicName: z.string().max(255).optional(),
  authorizationDate: z.coerce.date().optional(),
  validityDate: z.coerce.date().optional(),
  status: z.string().max(50).optional(),
  guideNumber: z.string().max(100).optional(),
  quantity: z.number().int().positive().optional(),
  notes: z.string().optional(),
  source: z.string().max(50).optional(),
  solicitationNumber: z.string().max(50).optional(),
  guidePassword: z.string().max(100).optional(),
  specialty: z.string().max(255).optional(),
  solicitationUrl: z.string().optional(),
  solicId: z.string().max(50).optional(),
  solicIdEncrypted: z.string().max(100).optional(),
  authorizationType: z.string().max(100).optional(),
  classification: z.string().max(255).optional(),
  localAddress: z.string().optional(),
  localPhone: z.string().max(50).optional(),
  locations: z.array(locationSchema).optional(),
  history: z.array(historySchema).optional(),
  medicalRecordId: z.string().uuid().optional(),
  providerExternalId: z.string().max(50).optional(),
})

export const updateAuthorizationSchema = createAuthorizationSchema.partial().omit({ patientId: true })

export const authorizationParamsSchema = z.object({ id: z.string().uuid() })
export const authorizationQuerySchema = z.object({ patientId: z.string().uuid().optional(), status: z.string().max(50).optional() })
