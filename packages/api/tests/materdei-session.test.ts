import { describe, it, expect } from 'vitest'
import {
  parseMaterDeiSessionJson,
  isSessionValid,
  resolveMaterDeiExamPatientIds,
  resolveMaterDeiGatewayPatientId,
} from '../src/infrastructure/scraper/materdei-sync.scraper.js'
import type { MaterDeiSession } from '../src/infrastructure/scraper/materdei-sync.scraper.js'

describe('parseMaterDeiSessionJson', () => {
  it('restores sessionExpiresAt from ISO string', () => {
    const exp = new Date(Date.now() + 3600_000).toISOString()
    const session = parseMaterDeiSessionJson(JSON.stringify({
      origin: 'https://meu.materdei.com.br',
      accessToken: 'token',
      refreshToken: 'refresh',
      userId: 1,
      patientId: 2,
      gatewayPatientId: 2,
      patient: {},
      sessionExpiresAt: exp,
    }))
    expect(session.sessionExpiresAt).toBeInstanceOf(Date)
    expect(isSessionValid(session)).toBe(true)
  })
})

describe('resolveMaterDeiExamPatientIds', () => {
  const base: MaterDeiSession = {
    origin: 'https://meu.materdei.com.br',
    accessToken: 't',
    refreshToken: '',
    userId: 1,
    patientId: 609856,
    gatewayPatientId: 609856,
    patient: { patientId: 0, gatewayPatientId: 609856 },
    sessionExpiresAt: new Date(Date.now() + 3600_000),
  }

  it('uses gatewayPatientId for titular profile, not patientId 0', () => {
    expect(resolveMaterDeiExamPatientIds(base)).toEqual([609856])
  })

  it('includes dependents with positive patientId', () => {
    const session = {
      ...base,
      patient: {
        patientId: 0,
        gatewayPatientId: 609856,
        dependents: [{ patientId: 12345, name: 'Bruno' }],
      },
    }
    expect(resolveMaterDeiExamPatientIds(session)).toEqual([609856, 12345])
  })

  it('uses own patientId when child account logs in directly', () => {
    const session = {
      ...base,
      patientId: 888,
      gatewayPatientId: 888,
      patient: { patientId: 888, gatewayPatientId: 888 },
    }
    expect(resolveMaterDeiExamPatientIds(session)).toEqual([888])
  })
})

describe('resolveMaterDeiGatewayPatientId', () => {
  it('returns gateway id for documents', () => {
    const session: MaterDeiSession = {
      origin: 'https://meu.materdei.com.br',
      accessToken: 't',
      refreshToken: '',
      userId: 1,
      patientId: 609856,
      gatewayPatientId: 609856,
      patient: { patientId: 0, gatewayPatientId: 609856 },
      sessionExpiresAt: new Date(),
    }
    expect(resolveMaterDeiGatewayPatientId(session)).toBe(609856)
  })
})
