import { describe, expect, it, vi } from 'vitest'
import { AvaProposedActionService } from '../src/application/llm/ava-proposed-action.service.js'
import { parseAvaChartSpec } from '../src/domain/llm/ava-chart-parser.js'

describe('parseAvaChartSpec', () => {
  it('parses valid line chart JSON', () => {
    const spec = parseAvaChartSpec(JSON.stringify({
      type: 'line',
      title: 'Hemoglobina',
      unit: 'g/dL',
      refLow: 11,
      refHigh: 13.5,
      series: [
        { label: 'Jan', value: 12.1, date: '2024-01-10' },
        { label: 'Jun', value: 11.4, date: '2024-06-15' },
      ],
    }))
    expect(spec?.type).toBe('line')
    expect(spec?.series.length).toBe(2)
    expect(spec?.refLow).toBe(11)
    expect(spec?.unit).toBe('g/dL')
  })

  it('rejects invalid payloads', () => {
    expect(parseAvaChartSpec('')).toBeNull()
    expect(parseAvaChartSpec('{"type":"pie","series":[]}')).toBeNull()
    expect(parseAvaChartSpec('{"type":"line","series":[{"label":"x"}]}')).toBeNull()
  })
})

describe('AvaProposedActionService.detectProposals', () => {
  const syncService = { requestSync: vi.fn(async () => ({ jobId: 'job-1' })) }
  const hygieneService = { resolve: vi.fn() }

  it('detects sync when message mentions portal sync', async () => {
    const links = {
      findAllByPatient: vi.fn(async () => [{
        id: 'link-1',
        portalType: 'unimed',
        email: 'a@b.com',
        encryptedPassword: 'x',
        encryptedSessionToken: 'tok',
        sessionExpiresAt: new Date(Date.now() + 3600_000),
      }]),
      findById: vi.fn(),
    }
    const hygieneRepo = {
      listForAccount: vi.fn(async () => []),
    }
    const svc = new AvaProposedActionService(
      links as never,
      hygieneRepo as never,
      hygieneService as never,
      syncService as never,
    )
    const proposals = await svc.detectProposals('acc', 'pat-1', 'Quero sincronizar o portal Unimed')
    expect(proposals.some((p) => p.type === 'integration_sync')).toBe(true)
  })

  it('detects clinical export proposal', async () => {
    const svc = new AvaProposedActionService(
      { findAllByPatient: vi.fn(), findById: vi.fn() } as never,
      { listForAccount: vi.fn(async () => []) } as never,
      hygieneService as never,
      syncService as never,
    )
    const proposals = await svc.detectProposals('acc', 'pat-1', 'Preciso exportar o prontuário em PDF')
    expect(proposals.some((p) => p.type === 'clinical_export')).toBe(true)
  })
})
