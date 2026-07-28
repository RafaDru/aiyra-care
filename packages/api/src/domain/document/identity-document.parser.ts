/**
 * Certidão-aware identity parser + OCR cleanup for Brazilian ID docs.
 */

export type IdentityDocumentType = 'certidao_nascimento' | 'rg' | 'cpf_card' | 'cnh'

export const IDENTITY_DOCUMENT_TYPES: readonly IdentityDocumentType[] = [
  'certidao_nascimento',
  'rg',
  'cpf_card',
  'cnh',
] as const

export function isIdentityDocumentType(type: string): type is IdentityDocumentType {
  return (IDENTITY_DOCUMENT_TYPES as readonly string[]).includes(type)
}

export interface SuggestedPatientFields {
  cpf?: string
  name?: string
  birthDate?: string // YYYY-MM-DD
  motherName?: string
  fatherName?: string
  sex?: 'male' | 'female'
}

const NOISE_NAME = /CORREGEDORIA|JUSTI[CÇ]A|REP[UÚ]BLICA|REGISTRO|CART[OÓ]RIO|CERTID[AÃ]O|SUBDISTRITO|PODER|JUDICI[AÁ]RIO|SELO|DIGITAL|TIPO\s+DOCUMENTO|ANOTA[CÇ][OÕ]ES|MATR[IÍ]CULA|NASCIMENTO|NATURALIDADE|FILIA[CÇ][AÃ]O|ORIGINAL|AUTENT|GENUINO/i

/** CPF check digits (Receita Federal algorithm). */
export function isValidCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return false
  if (/^(\d)\1{10}$/.test(digits)) return false

  const calc = (base: string, factor: number) => {
    let sum = 0
    for (let i = 0; i < base.length; i++) sum += Number(base[i]) * (factor - i)
    const mod = (sum * 10) % 11
    return mod === 10 ? 0 : mod
  }

  const d1 = calc(digits.slice(0, 9), 10)
  const d2 = calc(digits.slice(0, 10), 11)
  return d1 === Number(digits[9]) && d2 === Number(digits[10])
}

/** Try common OCR digit confusions until check digits pass. */
export function repairCpf(raw: string): string | undefined {
  const digits = raw.replace(/\D/g, '')
  if (digits.length !== 11) return undefined
  if (isValidCpf(digits)) return digits

  const swaps: Array<[string, string]> = [
    ['8', '6'], ['6', '8'],
    ['0', '8'], ['8', '0'],
    ['5', '6'], ['6', '5'],
    ['3', '8'], ['8', '3'],
    ['1', '7'], ['7', '1'],
    ['0', '9'], ['9', '0'],
  ]

  const chars = digits.split('')
  for (let i = 0; i < 9; i++) {
    for (const [from, to] of swaps) {
      if (chars[i] !== from) continue
      const trial = [...chars]
      trial[i] = to
      const candidate = trial.join('')
      if (isValidCpf(candidate)) return candidate
    }
  }
  return undefined
}

function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function titleCaseName(name: string): string {
  return normalizeSpaces(name)
    .toLowerCase()
    .split(' ')
    .map((w) => (w.length <= 2 && ['de', 'da', 'do', 'das', 'dos', 'e'].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

function parseBrDate(raw: string): string | undefined {
  const m = raw.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/)
  if (!m) return undefined
  const dd = m[1].padStart(2, '0')
  const mm = m[2].padStart(2, '0')
  const yyyy = m[3]
  const d = new Date(`${yyyy}-${mm}-${dd}T12:00:00`)
  if (isNaN(d.getTime())) return undefined
  const year = d.getFullYear()
  if (year < 1990 || year > new Date().getFullYear()) return undefined
  return `${yyyy}-${mm}-${dd}`
}

const PT_MONTHS: Record<string, string> = {
  janeiro: '01', fevereiro: '02', marco: '03', março: '03', abril: '04',
  maio: '05', junho: '06', julho: '07', agosto: '08',
  setembro: '09', outubro: '10', novembro: '11', dezembro: '12',
}

const PT_DAY: Record<string, string> = {
  'primeiro': '01', 'um': '01', 'dois': '02', 'tres': '03', 'três': '03',
  'quatro': '04', 'cinco': '05', 'seis': '06', 'sete': '07', 'oito': '08',
  'nove': '09', 'dez': '10', 'onze': '11', 'doze': '12', 'treze': '13',
  'quatorze': '14', 'catorze': '14', 'quinze': '15', 'dezesseis': '16',
  'dezessete': '17', 'dezoito': '18', 'dezenove': '19', 'vinte': '20',
  'trinta': '30',
}

function parsePtDateExtenso(text: string): string | undefined {
  // "vinte e três de janeiro de dois mil e vinte"
  const m = text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
    .match(/(primeiro|um|dois|tres|três|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte(?:\s+e\s+\w+)?|trinta(?:\s+e\s+\w+)?)\s+de\s+(janeiro|fevereiro|marco|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(dois\s+mil(?:\s+e\s+\w+)*)/i)
  if (!m) return undefined

  let dayRaw = m[1].trim()
  let day = PT_DAY[dayRaw]
  if (!day && dayRaw.startsWith('vinte')) {
    const rest = dayRaw.replace(/^vinte(?:\s+e\s+)?/, '')
    day = rest ? String(20 + Number(PT_DAY[rest] || 0)).padStart(2, '0') : '20'
    if (rest && PT_DAY[rest]) day = String(20 + Number(PT_DAY[rest])).padStart(2, '0')
  }
  if (!day && dayRaw.startsWith('trinta')) {
    const rest = dayRaw.replace(/^trinta(?:\s+e\s+)?/, '')
    day = rest && PT_DAY[rest] ? String(30 + Number(PT_DAY[rest])).padStart(2, '0') : '30'
  }
  const month = PT_MONTHS[m[2]]
  if (!day || !month) return undefined

  const yearPart = m[3]
  let year = 2000
  if (/dois\s+mil\s+e\s+vinte\s+e\s+dois/.test(yearPart)) year = 2022
  else if (/dois\s+mil\s+e\s+vinte/.test(yearPart)) year = 2020
  else if (/dois\s+mil\s+e\s+(\w+)/.test(yearPart)) {
    const y = yearPart.match(/dois\s+mil\s+e\s+(.+)/)?.[1] || ''
    // crude: "vinte e dois" => 2022 already handled; "vinte" => 2020
    if (y.includes('vinte') && y.includes('dois')) year = 2022
    else if (y.includes('vinte') && y.includes('um')) year = 2021
    else if (y.includes('vinte') && y.includes('tres')) year = 2023
    else if (y.startsWith('vinte')) year = 2020
  }

  return `${year}-${month}-${day}`
}

function lineAfterLabel(lines: string[], label: RegExp): string | undefined {
  for (let i = 0; i < lines.length; i++) {
    if (!label.test(lines[i])) continue
    const same = lines[i].replace(label, '').trim()
    if (same.length > 3) return same
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const next = lines[j].trim()
      if (!next || NOISE_NAME.test(next)) continue
      if (/^(CPF|MATR|DATA|HORA|SEXO|FILIA|AVOS|AVÓS|DIA|LOCAL|NOME|GEMEO)/i.test(next)) break
      return next
    }
  }
  return undefined
}

function extractCpfs(text: string): string[] {
  const found: string[] = []
  const re = /\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const repaired = repairCpf(m[1])
    if (repaired && !found.includes(repaired)) found.push(repaired)
  }
  // also spaced OCR like 193.580 98644
  const spaced = text.match(/\b(\d{3}[.\s]?\d{3}[.\s]?\d{3}[.\s-]?\d{2})\b/g) || []
  for (const s of spaced) {
    const repaired = repairCpf(s)
    if (repaired && !found.includes(repaired)) found.push(repaired)
  }
  return found
}

/**
 * Heuristic parser for Brazilian identity documents (certidão, RG, CPF card, CNH).
 */
export function parseIdentityDocument(text: string, documentType?: string): SuggestedPatientFields {
  if (!text?.trim()) return {}
  const raw = text.replace(/\r/g, '\n')
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
  const result: SuggestedPatientFields = {}

  // CPF — prefer labeled block
  const cpfLine = lineAfterLabel(lines, /^CPF\b/i)
  if (cpfLine) {
    const repaired = repairCpf(cpfLine) || extractCpfs(cpfLine)[0]
    if (repaired) result.cpf = repaired
  }
  if (!result.cpf) {
    const labeled = raw.match(/CPF[:\s]*([0-9.\s-]{11,18})/i)
    if (labeled) {
      const repaired = repairCpf(labeled[1])
      if (repaired) result.cpf = repaired
    }
  }
  if (!result.cpf) {
    const cpfs = extractCpfs(raw)
    if (cpfs.length) result.cpf = cpfs[0]
  }

  // Name after NOME (certidão layout)
  const nameLine = lineAfterLabel(lines, /^NOME\b/i)
  if (nameLine && !NOISE_NAME.test(nameLine) && /[A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç]{3,}/.test(nameLine)) {
    // strip accidental "PF " prefix from OCR
    result.name = titleCaseName(nameLine.replace(/^PF\s+/i, ''))
  }

  // Birth date numeric near DIA MES ANO
  const diaIdx = lines.findIndex((l) => /^DIA\s*M[EÊ]S\s*ANO/i.test(l) || /^DIA\s+MES\s+ANO/i.test(l))
  if (diaIdx >= 0) {
    for (let j = diaIdx + 1; j < Math.min(diaIdx + 3, lines.length); j++) {
      const d = parseBrDate(lines[j])
      if (d) { result.birthDate = d; break }
    }
  }
  if (!result.birthDate) {
    const birthLabeled = raw.match(/(?:Data\s+de\s+Nascimento|Nascimento|Nasc\.?)[:\s]*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})/i)
    if (birthLabeled) result.birthDate = parseBrDate(birthLabeled[1])
  }
  if (!result.birthDate) {
    const extensoBlock = raw.match(/DATA DE NASCIMENTO POR EXTENSO[\s\S]{0,120}?((?:primeiro|um|dois|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta)[^\n]{0,80}mil[^\n]{0,40})/i)
    if (extensoBlock) result.birthDate = parsePtDateExtenso(extensoBlock[1])
  }
  if (!result.birthDate) {
    const allDates = [...raw.matchAll(/\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})\b/g)]
      .map((m) => parseBrDate(m[1]))
      .filter((d): d is string => !!d)
    // Prefer dates that look like birth (not registration stamp year in future context)
    if (allDates.length) result.birthDate = allDates[0]
  }

  // Parents under FILIAÇÃO
  const filIdx = lines.findIndex((l) => /^FILIA/i.test(l))
  if (filIdx >= 0) {
    const parents: string[] = []
    for (let j = filIdx + 1; j < Math.min(filIdx + 5, lines.length); j++) {
      const line = lines[j]
      if (/^(AVOS|AVÓS|GEMEO|SEXO|LOCAL|DATA|MATR|NOME)/i.test(line)) break
      if (NOISE_NAME.test(line)) continue
      if (line.length < 5) continue
      const cleaned = line.replace(/,?\s*Natural de:.*$/i, '').trim()
      if (cleaned) parents.push(titleCaseName(cleaned))
    }
    if (parents[0]) result.fatherName = parents[0]
    if (parents[1]) result.motherName = parents[1]
  }

  const sexLine = lineAfterLabel(lines, /^SEXO\b/i)
  if (sexLine) {
    if (/masc/i.test(sexLine)) result.sex = 'male'
    if (/fem/i.test(sexLine)) result.sex = 'female'
  }

  if (!result.name && documentType === 'certidao_nascimento') {
    for (const line of lines) {
      if (NOISE_NAME.test(line)) continue
      if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç\s]{8,60}$/.test(line)
        && line.split(' ').length >= 3) {
        result.name = titleCaseName(line)
        break
      }
    }
  }

  return result
}
