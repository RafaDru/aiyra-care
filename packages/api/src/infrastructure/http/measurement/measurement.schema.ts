import { z } from 'zod'

const numeric = z.number().finite()
const optionalNumeric = numeric.optional().nullable()

export const measurementQuerySchema = z.object({
  patientId: z.string().uuid(),
  typeCodes: z.string().optional(),
  categories: z.string().optional(),
  healthThreadId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

export const createObservationSchema = z.object({
  patientId: z.string().uuid(),
  typeCode: z.string().min(1).max(64),
  observedAt: z.coerce.date(),
  valueNumeric: optionalNumeric,
  valueSecondary: optionalNumeric,
  unit: z.string().max(24).optional().nullable(),
  healthThreadId: z.string().uuid().optional().nullable(),
  context: z.record(z.unknown()).optional(),
  notes: z.string().max(2000).optional().nullable(),
})

export const batchObservationSchema = z.object({
  patientId: z.string().uuid(),
  observedAt: z.coerce.date(),
  healthThreadId: z.string().uuid().optional().nullable(),
  items: z.array(z.object({
    typeCode: z.string().min(1).max(64),
    valueNumeric: optionalNumeric,
    valueSecondary: optionalNumeric,
    unit: z.string().max(24).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    context: z.record(z.unknown()).optional(),
  })).min(1),
})

export const observationParamsSchema = z.object({ id: z.string().uuid() })

export const chartSeriesQuerySchema = z.object({
  patientId: z.string().uuid(),
  healthThreadId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  categories: z.string().optional(),
})

export const createAdministrationSchema = z.object({
  patientId: z.string().uuid(),
  medicationId: z.string().uuid().optional().nullable(),
  medicationName: z.string().min(1).max(500),
  administeredAt: z.coerce.date(),
  doseGiven: z.string().max(200).optional().nullable(),
  healthThreadId: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

export const administrationQuerySchema = z.object({
  patientId: z.string().uuid(),
  healthThreadId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

export const administrationParamsSchema = z.object({ id: z.string().uuid() })

export const timelineQuerySchema = z.object({
  patientId: z.string().uuid(),
  healthThreadId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

export const whoGrowthQuerySchema = z.object({
  patientId: z.string().uuid(),
  typeCode: z.enum(['weight', 'height', 'head_circumference']),
})

export const importGlucoseSchema = z.object({
  patientId: z.string().uuid(),
})

function splitCsv(v?: string): string[] | undefined {
  if (!v?.trim()) return undefined
  return v.split(',').map((s) => s.trim()).filter(Boolean)
}

export function parseMeasurementQuery(q: z.infer<typeof measurementQuerySchema>) {
  return {
    patientId: q.patientId,
    typeCodes: splitCsv(q.typeCodes),
    categories: splitCsv(q.categories),
    healthThreadId: q.healthThreadId,
    from: q.from,
    to: q.to,
  }
}

export function parseChartCategories(v?: string): string[] | undefined {
  return splitCsv(v)
}
