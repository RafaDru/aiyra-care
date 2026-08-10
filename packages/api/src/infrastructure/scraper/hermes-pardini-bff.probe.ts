import type { APIRequestContext } from 'playwright'
import {
  HERMES_PARDINI_BFF_EXAM_CANDIDATES,
  HERMES_PARDINI_PRECISION_CARE,
} from './hermes-pardini.portal.js'

export interface HermesPardiniExamProbeItem {
  externalKey: string
  name: string
  performedAt?: string | null
  raw: Record<string, unknown>
}

export interface HermesPardiniBffProbeResult {
  exams: HermesPardiniExamProbeItem[]
  discoveredPath?: string
  warnings: string[]
}

function authHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function pickExamList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  const root = asRecord(payload)
  for (const key of ['data', 'items', 'results', 'exames', 'exams', 'content']) {
    const nested = root[key]
    if (Array.isArray(nested)) return nested
    const rec = asRecord(nested)
    for (const inner of ['items', 'results', 'exames', 'exams', 'content']) {
      if (Array.isArray(rec[inner])) return rec[inner] as unknown[]
    }
  }
  return []
}

function mapExamItem(raw: unknown, index: number): HermesPardiniExamProbeItem | null {
  const rec = asRecord(raw)
  const name = String(
    rec.name ?? rec.examName ?? rec.procedureName ?? rec.descricao ?? rec.nome ?? rec.titulo ?? '',
  ).trim()
  if (!name) return null
  const id = rec.id ?? rec.examId ?? rec.codigo ?? rec.protocolo ?? index
  const dateRaw = rec.performedAt ?? rec.date ?? rec.data ?? rec.timestamp ?? rec.dataColeta ?? rec.dataExame
  let performedAt: string | null = null
  if (typeof dateRaw === 'string') performedAt = dateRaw
  else if (typeof dateRaw === 'number') performedAt = new Date(dateRaw).toISOString()
  return {
    externalKey: `hermes_pardini:${String(id)}`,
    name,
    performedAt,
    raw: rec,
  }
}

/**
 * Descobre endpoint de exames no BFF e tenta mapear lista básica.
 * Paths candidatos retornam 401 sem token — com token válido o primeiro 200 vira o path canônico.
 */
export async function probeHermesPardiniExams(
  request: APIRequestContext,
  accessToken: string,
): Promise<HermesPardiniBffProbeResult> {
  const warnings: string[] = []
  const base = HERMES_PARDINI_PRECISION_CARE.bffBase

  for (const path of HERMES_PARDINI_BFF_EXAM_CANDIDATES) {
    const res = await request.get(`${base}${path}`, { headers: authHeaders(accessToken) })
    if (res.status() === 404) continue
    if (res.status() === 401 || res.status() === 403) {
      warnings.push(`${path}: ${res.status()} — token rejeitado ou sem permissão`)
      continue
    }
    if (!res.ok()) {
      warnings.push(`${path}: HTTP ${res.status()}`)
      continue
    }

    const json = await res.json().catch(() => null)
    const list = pickExamList(json)
    const exams = list
      .map((item, i) => mapExamItem(item, i))
      .filter((e): e is HermesPardiniExamProbeItem => e != null)

    return { exams, discoveredPath: path, warnings }
  }

  warnings.push(
    'Endpoints de exames no BFF ainda não mapeados — sessão OK, aguardando captura de rede com credenciais reais',
  )
  return { exams: [], warnings }
}
