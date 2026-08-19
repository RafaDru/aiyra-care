import type { APIRequestContext } from 'playwright'

export interface AmilUsageItem {
  procedureDate: string
  procedureDescription: string
  doctorName: string
  providerName: string
  invoiceNumber: string
}

type Json = Record<string, unknown>

function asRecord(v: unknown): Json | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : null
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? (v as unknown[]) : []
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

export async function fetchAmilUtilizacao(
  request: APIRequestContext,
  token: string,
  marcaOtica: string,
  apiBase: string,
  opts?: { periodStart?: Date; periodEnd?: Date },
): Promise<AmilUsageItem[]> {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Origin: 'https://www.amil.com.br',
    Referer: 'https://www.amil.com.br/beneficiario/',
  }

  const now = new Date()
  const start = opts?.periodStart ?? new Date(now.getFullYear() - 1, 0, 1) // default 1.5 anos atrás
  const end = opts?.periodEnd ?? now

  const windows: Array<{ startStr: string; endStr: string }> = []
  let currYear = start.getFullYear()
  const endYear = end.getFullYear()

  while (currYear <= endYear) {
    windows.push({ startStr: `${currYear}-01-01`, endStr: `${currYear}-06-30` })
    windows.push({ startStr: `${currYear}-07-01`, endStr: `${currYear}-12-31` })
    currYear++
  }

  const items: AmilUsageItem[] = []
  const seenKeys = new Set<string>()

  for (const w of windows) {
    const baseClean = apiBase.replace(/\/+$/, '')
    const url = `${baseClean}/Beneficiario/BuscarDemonstrativoUtilizacao/${marcaOtica}/${w.startStr}/${w.endStr}`
    try {
      const res = await request.get(url, { headers, timeout: 5000 })
      if (!res.ok()) continue
      const data = (await res.json().catch(() => null)) as Json | null
      const obj = asRecord(data?.dadosDemonstrativoUtilizacao)
      const servicos = asArray(obj?.servicos)

      for (const s of servicos) {
        const sRec = asRecord(s)
        const atendimentos = asArray(sRec?.atendimentos)
        for (const a of atendimentos) {
          const aRec = asRecord(a)
          if (!aRec) continue
          const procedimento = String(aRec.procedimento || aRec.descricao || '').trim()
          const prestador = String(aRec.prestador || aRec.nomePrestador || '').trim()
          const rawDate = String(aRec.dataRealizacao || aRec.dataAtendimento || '').trim()
          const date = formatDate(rawDate)
          const id = String(aRec.id || '').trim()

          const key = `${date}|${procedimento}|${prestador}`
          if (seenKeys.has(key)) continue
          seenKeys.add(key)

          items.push({
            procedureDate: date,
            procedureDescription: procedimento || 'Atendimento Amil',
            doctorName: String(aRec.medico || aRec.nomeMedico || '').trim(),
            providerName: prestador || 'Amil',
            invoiceNumber: id,
          })
        }
      }
    } catch {
      // silencia erros de janela individual
    }
  }

  return items
}
