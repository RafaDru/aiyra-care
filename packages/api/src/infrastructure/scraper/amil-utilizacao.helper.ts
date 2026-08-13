import type { APIRequestContext } from 'playwright'

export interface AmilUsageItem {
  procedureDate: string
  procedureDescription: string
  doctorName: string
  providerName: string
  invoiceNumber: string
  kind: 'consulta' | 'exame' | 'outro'
}

type Json = Record<string, unknown>

const UTILIZATION_PATHS = [
  (marca: string) => `/Beneficiario/${marca}/Utilizacao`,
  (marca: string) => `/Beneficiario/${marca}/ExtratoUtilizacao`,
  (marca: string) => `/Utilizacao/${marca}`,
  (marca: string) => `/ExtratoUtilizacao/${marca}`,
]

function asRecord(v: unknown): Json | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? v as Json : null
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

function pickList(raw: unknown): Json[] {
  const rec = asRecord(raw)
  if (!rec) return []
  const direct = asArray(rec.lista ?? rec.Lista ?? rec.items ?? rec.data)
  if (direct.length) return direct.map((x) => asRecord(x) ?? {})
  const objeto = asRecord(rec.objeto)
  if (objeto) {
    const nested = asArray(objeto.lista ?? objeto.Lista ?? objeto.items)
    if (nested.length) return nested.map((x) => asRecord(x) ?? {})
  }
  for (const val of Object.values(rec)) {
    if (Array.isArray(val) && val.length) {
      return val.map((x) => asRecord(x) ?? {})
    }
  }
  return []
}

function classify(description: string): AmilUsageItem['kind'] {
  const d = description.toUpperCase()
  if (d.includes('CONSULTA')) return 'consulta'
  if (d.includes('EXAME') || d.includes('LABORATOR') || d.includes('RAIO')) return 'exame'
  return 'outro'
}

function formatDate(raw: unknown): string {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s
  const d = new Date(s.includes('T') ? s : `${s}T12:00:00Z`)
  if (isNaN(d.getTime())) return s
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function mapRow(row: Json): AmilUsageItem | null {
  const description = String(
    row.descricao ?? row.Descricao ?? row.procedimento ?? row.Procedimento ?? row.evento ?? '',
  ).trim()
  const doctorName = String(
    row.nomeMedico ?? row.NomeMedico ?? row.prestador ?? row.Prestador ?? row.nomePrestador ?? '',
  ).trim()
  const providerName = String(
    row.nomePrestador ?? row.NomePrestador ?? row.prestador ?? row.Prestador ?? doctorName,
  ).trim()
  const date = formatDate(
    row.dataAtendimento ?? row.DataAtendimento ?? row.data ?? row.Data ?? row.dataRealizacao,
  )
  if (!date && !description) return null
  return {
    procedureDate: date,
    procedureDescription: description || 'Utilização',
    doctorName,
    providerName,
    invoiceNumber: String(row.notaFiscal ?? row.NotaFiscal ?? row.numeroGuia ?? row.NumeroGuia ?? '').trim(),
    kind: classify(description),
  }
}

export async function fetchAmilUtilizacao(
  request: APIRequestContext,
  token: string,
  marcaOtica: string,
  apiBase: string,
): Promise<AmilUsageItem[]> {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }

  for (const buildPath of UTILIZATION_PATHS) {
    const path = buildPath(marcaOtica)
    const url = `${apiBase}${path}`
    const res = await request.get(url, { headers, timeout: 20000 }).catch(() => null)
    if (!res || !res.ok()) continue
    const raw = await res.json().catch(() => null)
    const rows = pickList(raw)
    const mapped = rows.map(mapRow).filter((x): x is AmilUsageItem => x !== null)
    if (mapped.length) return mapped
  }

  return []
}
