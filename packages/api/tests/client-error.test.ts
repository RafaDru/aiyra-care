import { describe, expect, it } from 'vitest'
import {
  computeClientErrorFingerprint,
  sanitizeClientErrorCode,
  sanitizeClientErrorFeature,
  sanitizeClientErrorProperties,
} from '../src/domain/telemetry/client-error.js'
import { ClientErrorService } from '../src/application/telemetry/client-error.service.js'
import { vi } from 'vitest'

describe('computeClientErrorFingerprint', () => {
  it('é determinístico para feature + kind + code', () => {
    const a = computeClientErrorFingerprint('patient_context', 'api', 'HTTP_503')
    const b = computeClientErrorFingerprint('patient_context', 'api', 'HTTP_503')
    expect(a).toBe(b)
    expect(a.length).toBe(16)
  })
})

describe('sanitizeClientErrorProperties', () => {
  it('remove chaves com PHI e mantém allowlist', () => {
    const out = sanitizeClientErrorProperties({
      api_path: '/exams/1',
      message: 'febre',
      http_status: 503,
    })
    expect(out).toEqual({
      api_path: '/exams/1',
      http_status: 503,
    })
  })
})

describe('ClientErrorService.ingest', () => {
  it('rejeita fingerprint incorreto', async () => {
    const repo = { insertMany: vi.fn(async () => []) }
    const svc = new ClientErrorService(repo as never)
    const fp = computeClientErrorFingerprint('patient_detail', 'api', 'HTTP_404')
    const result = await svc.ingest('acc-1', [{
      fingerprint: 'wrong-fingerprint',
      feature: 'patient_detail',
      errorKind: 'api',
      errorCode: 'HTTP_404',
    }])
    expect(result.accepted).toBe(0)
    expect(result.rejected).toBe(1)
    expect(repo.insertMany).not.toHaveBeenCalled()

    const ok = await svc.ingest('acc-1', [{
      fingerprint: fp,
      feature: 'patient_detail',
      errorKind: 'api',
      errorCode: 'HTTP_404',
    }])
    expect(ok.accepted).toBe(1)
  })

  it('normaliza feature inválida', () => {
    expect(sanitizeClientErrorFeature('Patient Detail')).toBeNull()
    expect(sanitizeClientErrorFeature('patient_detail')).toBe('patient_detail')
    expect(sanitizeClientErrorCode('HTTP 503')).toBe('HTTP_503')
  })
})
