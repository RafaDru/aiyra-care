import { describe, expect, it, vi } from 'vitest'
import type { APIRequestContext } from 'playwright'
import { fetchHermesPardiniExams } from '../src/infrastructure/scraper/hermes-pardini-bff.service.js'

function mockResponse(status: number, body: unknown, ok = status >= 200 && status < 300) {
  return {
    status: () => status,
    ok: () => ok,
    json: async () => body,
  }
}

function createMockRequest(
  pedidosPages: Array<{ temPaginaSeguinte: boolean; dados: unknown[] }>,
  examesByPedido: Record<string, unknown[]>,
): APIRequestContext {
  let pedidoPage = 0
  return {
    get: vi.fn(async (url: string) => {
      if (url.includes('/exames')) {
        const pedidoId = url.match(/\/pedidos\/([^/]+)\/exames/)?.[1] ?? ''
        return mockResponse(200, { exames: examesByPedido[pedidoId] ?? [] })
      }
      const page = pedidosPages[pedidoPage] ?? { temPaginaSeguinte: false, dados: [] }
      pedidoPage++
      return mockResponse(200, page)
    }),
  } as unknown as APIRequestContext
}

describe('hermes-pardini-bff.service', () => {
  it('paginates pedidos and maps exames per pedido', async () => {
    const request = createMockRequest(
      [
        {
          temPaginaSeguinte: true,
          dados: [{ idPedido: 101, dataPedido: '2026-01-10', nomeUnidade: 'Lab Centro' }],
        },
        {
          temPaginaSeguinte: false,
          dados: [{ idPedido: 102, dataResultado: '2026-02-01', nomeUnidade: 'Lab Sul' }],
        },
      ],
      {
        101: [{ id: 1, nomeExame: 'Hemograma', dataLiberacao: '2026-01-12' }],
        102: [{ id: 2, nomeExame: 'Glicemia', dataLiberacao: '2026-02-02' }],
      },
    )

    const result = await fetchHermesPardiniExams(request, 'token', {
      startDate: '2026-01-01',
      endDate: '2026-02-28',
    })

    expect(result.pedidosCount).toBe(2)
    expect(result.exams).toHaveLength(2)
    expect(result.exams[0]).toMatchObject({
      externalKey: 'hermes_pardini:101:1',
      pedidoId: '101',
      name: 'Hemograma',
      performedAt: '2026-01-12',
      laboratory: 'Lab Centro',
    })
    expect(result.exams[1]).toMatchObject({
      externalKey: 'hermes_pardini:102:2',
      name: 'Glicemia',
      laboratory: 'Lab Sul',
    })
  })

  it('skips exames without nomeExame', async () => {
    const request = createMockRequest(
      [{ temPaginaSeguinte: false, dados: [{ idPedido: 1, dataPedido: '2026-03-01' }] }],
      { 1: [{ id: 9, nomeExame: '' }, { id: 10, nomeExame: 'TSH' }] },
    )

    const result = await fetchHermesPardiniExams(request, 'token')
    expect(result.exams).toHaveLength(1)
    expect(result.exams[0].name).toBe('TSH')
  })

  it('downloads pedido PDF via POST /download', async () => {
    const pdfBytes = Buffer.from('%PDF-1.4 test')
    const request = {
      get: vi.fn(),
      post: vi.fn(async (url: string) => ({
        status: () => 200,
        ok: () => true,
        headers: () => ({ 'content-type': 'application/pdf' }),
        body: async () => pdfBytes,
      })),
    } as unknown as APIRequestContext

    const { downloadHermesPardiniPedidoPdf } = await import(
      '../src/infrastructure/scraper/hermes-pardini-bff.service.js'
    )
    const file = await downloadHermesPardiniPedidoPdf(request, 'token', 55)
    expect(file?.filename).toBe('hermes-pardini-pedido-55.pdf')
    expect(file?.buffer.equals(pdfBytes)).toBe(true)
    expect(request.post).toHaveBeenCalledWith(
      expect.stringContaining('/pedidos/55/download'),
      expect.objectContaining({ data: {} }),
    )
  })
})
