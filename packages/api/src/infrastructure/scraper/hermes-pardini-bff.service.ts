import type { APIRequestContext } from 'playwright'
import {
  HERMES_PARDINI_PEDIDOS_PAGE_SIZE,
  HERMES_PARDINI_PRECISION_CARE,
  FLEURY_PRECISION_MARCA_PROFILES,
  hermesPardiniResultadosExameUrl,
} from './hermes-pardini.portal.js'
import { extractHermesPardiniExamSummary } from './hermes-pardini-exam-summary.js'
import {
  hermesPardiniPedidoApiId,
  hermesPardiniPedidoDisplayFromPedido,
} from './hermes-pardini-pedido-id.js'

export interface HermesPardiniExamItem {
  externalKey: string
  /** ID para rotas `/pedidos/{id}` na API Hermes */
  pedidoId: string
  /** Label legível (ex. `1244885-34`) — `numeroPedido` do portal quando disponível */
  pedidoDisplayId: string
  name: string
  performedAt?: string | null
  laboratory?: string | null
  resultSummary?: string | null
  raw: Record<string, unknown>
}

export interface HermesPardiniBffFetchResult {
  exams: HermesPardiniExamItem[]
  pedidosCount: number
  warnings: string[]
}

interface HermesPardiniPedido {
  idPedido?: number | string
  numeroPedido?: string | number
  dataPedido?: string
  dataResultado?: string
  nomeUnidade?: string
  status?: number
}

interface HermesPardiniExame {
  id?: number | string
  nomeExame?: string
  dataLiberacao?: string
  dataResultado?: string
  status?: number
}

export type HermesPardiniApiHeaderProfile = Record<string, string>

/** Headers de marca exigidos pela API paciente (Precision Care / Pardini). */
export const HERMES_PARDINI_PACIENTE_API_DEFAULT_HEADERS: Record<string, string> =
  FLEURY_PRECISION_MARCA_PROFILES.pardini

function authHeaders(
  accessToken: string,
  profile?: HermesPardiniApiHeaderProfile,
): Record<string, string> {
  return {
    ...HERMES_PARDINI_PACIENTE_API_DEFAULT_HEADERS,
    ...profile,
    Authorization: `Bearer ${accessToken}`,
    Accept: profile?.Accept ?? profile?.accept ?? 'application/json',
    Origin: profile?.Origin ?? profile?.origin ?? HERMES_PARDINI_PRECISION_CARE.portalOrigin,
    Referer: profile?.Referer ?? profile?.referer ?? hermesPardiniResultadosExameUrl(),
  }
}

/** Verifica se o token funciona na API de pedidos (não só exp do JWT). */
export async function probeHermesPardiniPacienteAccess(
  request: APIRequestContext,
  accessToken: string,
  headerProfile?: HermesPardiniApiHeaderProfile,
): Promise<boolean> {
  const base = HERMES_PARDINI_PRECISION_CARE.pacienteApiBase
  const res = await request.get(`${base}/pedidos`, {
    headers: authHeaders(accessToken, headerProfile),
    params: cleanParams({
      limit: 1,
      offset: 0,
      crescente: 'false',
      status: '',
    }),
  })
  if (res.status() === 401 || res.status() === 403) return false
  return res.ok()
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function cleanParams(
  params: Record<string, string | number | undefined | null>,
): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    out[key] = value
  }
  return out
}

function formatDateYmd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function pickPedidoList(payload: unknown): { pedidos: HermesPardiniPedido[]; hasNext: boolean } {
  const root = asRecord(payload)
  const dados = root.dados
  const pedidos = Array.isArray(dados) ? dados as HermesPardiniPedido[] : []
  const hasNext = Boolean(root.temPaginaSeguinte)
  return { pedidos, hasNext }
}

function pickExameList(payload: unknown): HermesPardiniExame[] {
  const root = asRecord(payload)
  const data = asRecord(root.data ?? root.dados ?? root)
  const exames = data.exames ?? root.exames ?? data.listaExames ?? root.listaExames
  return Array.isArray(exames) ? exames as HermesPardiniExame[] : []
}

function pickExamDate(exam: HermesPardiniExame, pedido: HermesPardiniPedido): string | null {
  const candidates = [
    exam.dataLiberacao,
    exam.dataResultado,
    pedido.dataResultado,
    pedido.dataPedido,
  ]
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function mapExamItem(
  exam: HermesPardiniExame,
  pedido: HermesPardiniPedido,
  index: number,
): HermesPardiniExamItem | null {
  const name = String(exam.nomeExame ?? '').trim()
  if (!name) return null

  const pedidoApiId = hermesPardiniPedidoApiId(pedido)
  const pedidoDisplayId = hermesPardiniPedidoDisplayFromPedido(pedido)
  const examId = exam.id ?? `${pedidoApiId}:${index}`
  const performedAt = pickExamDate(exam, pedido)
  const pedidoRecord = asRecord(pedido)
  const examRecord = asRecord(exam)
  const resultSummary = extractHermesPardiniExamSummary(examRecord, pedidoRecord)

  return {
    externalKey: `hermes_pardini:${String(pedidoApiId)}:${String(examId)}`,
    pedidoId: pedidoApiId,
    pedidoDisplayId,
    name,
    performedAt,
    laboratory: pedido.nomeUnidade ?? 'Hermes Pardini',
    resultSummary,
    raw: {
      pedido: pedidoRecord,
      exame: examRecord,
    },
  }
}

async function fetchPedidosPage(
  request: APIRequestContext,
  accessToken: string,
  params: {
    limit: number
    offset: number
    startDate?: string
    endDate?: string
  },
  headerProfile?: HermesPardiniApiHeaderProfile,
): Promise<{ pedidos: HermesPardiniPedido[]; hasNext: boolean }> {
  const base = HERMES_PARDINI_PRECISION_CARE.pacienteApiBase
  const query = cleanParams({
    limit: params.limit,
    offset: params.offset,
    startDate: params.startDate,
    endDate: params.endDate,
    crescente: 'false',
    status: '',
  })

  const res = await request.get(`${base}/pedidos`, {
    headers: authHeaders(accessToken, headerProfile),
    params: query,
  })

  if (res.status() === 401 || res.status() === 403) {
    throw new Error(`Token Hermes Pardini rejeitado (${res.status()})`)
  }
  if (!res.ok()) {
    throw new Error(`Lista de pedidos Hermes Pardini falhou (HTTP ${res.status()})`)
  }

  const json = await res.json().catch(() => null)
  return pickPedidoList(json)
}

async function fetchExamesForPedido(
  request: APIRequestContext,
  accessToken: string,
  pedidoId: number | string,
  headerProfile?: HermesPardiniApiHeaderProfile,
): Promise<HermesPardiniExame[]> {
  const base = HERMES_PARDINI_PRECISION_CARE.pacienteApiBase
  const res = await request.get(`${base}/pedidos/${pedidoId}/exames`, {
    headers: authHeaders(accessToken, headerProfile),
    params: cleanParams({}),
  })

  if (res.status() === 404) return []
  if (!res.ok()) {
    throw new Error(`Exames do pedido ${pedidoId} falharam (HTTP ${res.status()})`)
  }

  const json = await res.json().catch(() => null)
  return pickExameList(json)
}

async function fetchAllPedidos(
  request: APIRequestContext,
  accessToken: string,
  opts?: { startDate?: string; endDate?: string },
  headerProfile?: HermesPardiniApiHeaderProfile,
): Promise<HermesPardiniPedido[]> {
  const limit = HERMES_PARDINI_PEDIDOS_PAGE_SIZE
  const endDate = opts?.endDate ?? formatDateYmd(new Date())
  const pedidos: HermesPardiniPedido[] = []
  let offset = 0
  let hasNext = true

  while (hasNext) {
    const page = await fetchPedidosPage(request, accessToken, {
      limit,
      offset,
      startDate: opts?.startDate,
      endDate,
    }, headerProfile)
    pedidos.push(...page.pedidos)
    hasNext = page.hasNext && page.pedidos.length > 0
    offset += limit
    if (!page.pedidos.length) break
  }

  return pedidos
}

async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
  }
  return results
}

/**
 * Lista pedidos paginados (`GET /pedidos`) e expande exames (`GET /pedidos/{id}/exames`).
 */
export async function fetchHermesPardiniExams(
  request: APIRequestContext,
  accessToken: string,
  opts?: { startDate?: string; endDate?: string; headerProfile?: HermesPardiniApiHeaderProfile },
): Promise<HermesPardiniBffFetchResult> {
  const warnings: string[] = []
  const headerProfile = opts?.headerProfile
  const pedidos = await fetchAllPedidos(request, accessToken, opts, headerProfile)

  if (!pedidos.length) {
    return { exams: [], pedidosCount: 0, warnings }
  }

  const examGroups = await mapInBatches(pedidos, 5, async (pedido) => {
    const pedidoApiId = hermesPardiniPedidoApiId(pedido)
    if (pedidoApiId === 'unknown') {
      warnings.push('Pedido sem idPedido ignorado')
      return []
    }
    try {
      return await fetchExamesForPedido(request, accessToken, pedidoApiId, headerProfile)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      warnings.push(`Pedido ${pedidoApiId}: ${msg}`)
      return []
    }
  })

  const exams: HermesPardiniExamItem[] = []
  for (let i = 0; i < pedidos.length; i++) {
    const pedido = pedidos[i]
    const exames = examGroups[i] ?? []
    for (let j = 0; j < exames.length; j++) {
      const mapped = mapExamItem(exames[j], pedido, j)
      if (mapped) exams.push(mapped)
    }
  }

  return { exams, pedidosCount: pedidos.length, warnings }
}

export interface HermesPardiniPdfFile {
  buffer: Buffer
  filename: string
  mimeType: string
}

/**
 * Baixa laudo PDF consolidado do pedido (`POST /pedidos/{id}/download`).
 */
export async function downloadHermesPardiniPedidoPdf(
  request: APIRequestContext,
  accessToken: string,
  pedidoId: number | string,
  headerProfile?: HermesPardiniApiHeaderProfile,
): Promise<HermesPardiniPdfFile | null> {
  const base = HERMES_PARDINI_PRECISION_CARE.pacienteApiBase
  const res = await request.post(`${base}/pedidos/${pedidoId}/download`, {
    headers: {
      ...authHeaders(accessToken, headerProfile),
      Accept: 'application/pdf, application/octet-stream',
      'Content-Type': 'application/json',
    },
    data: {},
  })

  if (res.status() === 404 || res.status() === 400 || res.status() === 204) return null
  if (res.status() === 401 || res.status() === 403) {
    throw new Error(`Token Hermes Pardini rejeitado no download (${res.status()})`)
  }
  if (!res.ok()) {
    throw new Error(`Download laudo pedido ${pedidoId} falhou (HTTP ${res.status()})`)
  }

  const contentType = (res.headers()['content-type'] ?? '').toLowerCase()
  if (!contentType.includes('pdf') && !contentType.includes('octet-stream')) {
    return null
  }

  const body = await res.body()
  if (!body?.length) return null

  return {
    buffer: body,
    filename: `hermes-pardini-pedido-${pedidoId}.pdf`,
    mimeType: 'application/pdf',
  }
}
