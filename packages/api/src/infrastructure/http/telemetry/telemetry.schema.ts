import { z } from 'zod'

export const telemetryEventSchema = z.object({
  eventName: z.string().min(1).max(64),
  sessionId: z.string().max(64).optional(),
  route: z.string().max(128).optional(),
  patientId: z.string().uuid().optional(),
  properties: z.record(z.unknown()).optional(),
})

export const telemetryIngestBodySchema = z.object({
  events: z.array(telemetryEventSchema).min(1).max(25),
})

export const clientErrorSchema = z.object({
  fingerprint: z.string().min(8).max(32),
  feature: z.string().min(1).max(64),
  errorKind: z.enum(['ui_boundary', 'api', 'network']),
  errorCode: z.string().min(1).max(64),
  sessionId: z.string().max(64).optional(),
  route: z.string().max(256).optional(),
  patientId: z.string().uuid().optional(),
  properties: z.record(z.unknown()).optional(),
})

export const clientErrorsIngestBodySchema = z.object({
  errors: z.array(clientErrorSchema).min(1).max(15),
})
