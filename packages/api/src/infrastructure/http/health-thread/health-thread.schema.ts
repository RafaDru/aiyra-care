import { z } from 'zod'

const kindSchema = z.enum(['acompanhamento', 'task', 'investigation', 'hypothesis', 'episode'])
  .transform((v) => (v === 'task' ? 'acompanhamento' : v))
const statusSchema = z.enum(['open', 'active', 'paused', 'resolved', 'ruled_out', 'converted'])
const prioritySchema = z.enum(['low', 'normal', 'high'])
const confidenceSchema = z.enum(['low', 'medium', 'high'])

export const createHealthThreadSchema = z.object({
  patientId: z.string().uuid(),
  kind: kindSchema,
  title: z.string().min(1).max(500),
  summary: z.string().max(2000).optional(),
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  confidence: confidenceSchema.optional(),
  startedAt: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const updateHealthThreadSchema = createHealthThreadSchema
  .partial()
  .omit({ patientId: true })
  .extend({
    endedAt: z.coerce.date().optional(),
  })

export const healthThreadParamsSchema = z.object({ id: z.string().uuid() })

export const healthThreadQuerySchema = z.object({
  patientId: z.string().uuid().optional(),
  status: statusSchema.optional(),
  activeOnly: z
    .union([z.boolean(), z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === true || v === 'true'),
})

export const closeHealthThreadSchema = z.object({
  status: z.enum(['resolved', 'ruled_out', 'converted']),
})

export const investigationWizardSchema = z.object({
  patientId: z.string().uuid(),
  title: z.string().min(1).max(500),
  reason: z.string().max(2000).optional(),
  workingHypothesis: z.string().max(500).optional(),
  symptoms: z.array(z.string().max(200)).optional(),
  plannedSteps: z.array(z.string().max(200)).optional(),
})

export const taskWizardSchema = z.object({
  patientId: z.string().uuid(),
  title: z.string().min(1).max(500),
  summary: z.string().max(2000).optional(),
  assignee: z.string().max(255).optional(),
  location: z.string().max(255).optional(),
  dueDate: z.coerce.date().optional(),
})

export const addThreadEntrySchema = z.object({
  body: z.string().min(1).max(5000),
})

const linkRoleSchema = z.enum(['ordered', 'scheduled', 'result', 'related', 'blocked_by'])
const linkEntitySchema = z.enum([
  'exam',
  'medical_record',
  'authorization',
  'diagnosis',
  'document',
  'appointment',
  'allergy',
  'medication',
  'vaccine',
])

export const linkArtifactSchema = z.object({
  entityType: linkEntitySchema,
  entityId: z.string().uuid(),
  role: linkRoleSchema.optional(),
  label: z.string().max(255).optional(),
})

export const createExamFromThreadSchema = z.object({
  examType: z.string().min(1).max(100),
  examDate: z.coerce.date(),
  laboratory: z.string().max(255).optional(),
  resultSummary: z.string().optional(),
  notes: z.string().optional(),
  role: linkRoleSchema.optional(),
  source: z.string().max(50).optional(),
})

export const createMedicalRecordFromThreadSchema = z.object({
  recordDate: z.coerce.date(),
  recordType: z.string().min(1).max(50).default('consulta'),
  description: z.string().optional(),
  doctorName: z.string().max(255).optional(),
  specialty: z.string().max(100).optional(),
  clinicName: z.string().max(255).optional(),
  notes: z.string().optional(),
  role: linkRoleSchema.optional(),
  source: z.string().max(50).optional(),
})

export const createAuthorizationFromThreadSchema = z.object({
  procedureDescription: z.string().min(1).max(500),
  authorizationDate: z.coerce.date().optional(),
  validityDate: z.coerce.date().optional(),
  status: z.string().max(50).optional(),
  guideNumber: z.string().max(100).optional(),
  doctorName: z.string().max(255).optional(),
  clinicName: z.string().max(255).optional(),
  role: linkRoleSchema.optional(),
  source: z.string().max(50).optional(),
})

export const convertToAllergySchema = z.object({
  allergen: z.string().min(1).max(255),
  reaction: z.string().optional(),
  severity: z.string().max(50).optional(),
  notes: z.string().optional(),
})

export const convertToDiagnosisSchema = z.object({
  diagnosisName: z.string().min(1),
  diagnosisCode: z.string().max(20).optional(),
  description: z.string().optional(),
  isChronic: z.boolean().optional(),
  diagnosedDate: z.coerce.date().optional(),
  status: z.string().max(50).optional(),
})

export const createMedicationFromThreadSchema = z.object({
  genericName: z.string().min(1).max(255),
  brandName: z.string().max(255).optional(),
  dosage: z.string().max(100).optional(),
  frequency: z.string().max(100).optional(),
  route: z.string().max(50).optional(),
  startDate: z.coerce.date().optional(),
  prescribingDoctor: z.string().max(255).optional(),
  notes: z.string().optional(),
  role: linkRoleSchema.optional(),
})

export const createVaccineFromThreadSchema = z.object({
  vaccineName: z.string().min(1).max(255),
  applicationDate: z.coerce.date(),
  doseNumber: z.number().int().positive().optional(),
  batchNumber: z.string().max(100).optional(),
  clinic: z.string().max(255).optional(),
  appliedBy: z.string().max(255).optional(),
  notes: z.string().optional(),
  role: linkRoleSchema.optional(),
  source: z.string().max(50).optional(),
})
