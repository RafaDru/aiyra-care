/**
 * Parser v2 para laudos PDF do Hospital Mater Dei.
 *
 * Estratégia: EXTRAÇÃO POR SEÇÕES — o laudo do Mater Dei é uma concatenação de
 * blocos "EXAME\nMaterial:\nColeta:\nMétodo:\nRESULTADO:\nValor de Referência:".
 * Cada bloco é isolado ANTES da extração, evitando contaminação cruzada
 * (ex.: regex de "GLICOSE" casando com "GLICOSE 6-FOSFATO DEHIDROGENASE",
 * ou valor de um exame vazando para o bloco seguinte via [\s\S]*?).
 */

import type {
  ExamReportParseResult,
  ExamReportParser,
  ExtractedExamMarkerItem,
} from '../../domain/exam-artifact/exam-artifact.types.js'

export interface MaterDeiPdfParseResult extends ExamReportParseResult {}

const SECTION_HEADER_RE =
  /^(?:[A-Z0-9À-Ú][A-Z0-9À-Ú\s\/\-\(\)\.,ºª°+'´`çÇ]{4,120}|PESQUISA DE [A-Z\s]+|TESTE DO .+|DIAGNÓSTICO MOLECULAR.+)$/u

function parseBrazilianDateTime(dateStr: string): Date | null {
  if (!dateStr) return null
  const m = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s*-\s*(\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (!m) return null

  const [, day, month, year, hour, min, sec] = m
  const d = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    hour ? Number(hour) : 12,
    min ? Number(min) : 0,
    sec ? Number(sec) : 0,
  )
  return isNaN(d.getTime()) ? null : d
}

/** Converte valores BR ("10.700", "4,44", "116", "> 500", "2.08"). */
function parseNumericValue(valStr: string | undefined): number | undefined {
  if (!valStr) return undefined
  const clean = valStr
    .trim()
    .replace(/^(?:inferior a|superior a|até|menor que|maior que)\s*/i, '')
    .replace(/[><≥≤]\s*/, '')
    // Ponto é milhar APENAS se seguido de exatamente 3 dígitos e não-vírgula depois
    // ("10.700" → 10700; "2.08" → mantém; "3.01" → mantém)
    .replace(/(\d)\.(?=\d{3}(?!\d))/g, '$1')
    .replace(',', '.')
    .replace(/[^\d.]/g, '')
  if (!clean || clean === '.') return undefined
  const num = Number(clean)
  return Number.isFinite(num) ? num : undefined
}

interface ReportSection {
  /** Título do exame (primeira(s) linha(s) antes de "Material:"). */
  title: string
  body: string
  collectedAt?: Date
}

/**
 * Divide o laudo completo em seções por exame.
 * Cada seção começa no título (linha maiúscula após o rodapé do exame anterior)
 * e vai até o próximo título/rodapé.
 */
export function splitIntoSections(fullText: string): ReportSection[] {
  const lines = fullText.split('\n').map((l) => l.trimEnd())
  const sections: ReportSection[] = []
  let current: ReportSection | null = null
  let pendingTitleLines: string[] = []

  const FOOTER_RE =
    /^(?:A interpretação deste|Exame realizado pelo laboratório|ASSINATURA|Assinatura digital|CNES:|Nome:|Data de nascimento:|Pedido\.+|Data pedido:|O\.S|Médico\.+|\d\/\d|_+|\s*)$/

  for (const rawLine of lines) {
    const line = rawLine.trim()

    // Rodapé/assinatura → fecha a seção corrente (o próximo título abre nova)
    if (FOOTER_RE.test(line)) continue

    const isHeaderCandidate =
      line.length >= 4 &&
      line === line.toUpperCase() &&
      /[A-Z]/.test(line) &&
      !/^(?:MATERIAL|COLETA|LIBERAÇÃO|MÉTODO|RESULTADO|VALOR DE REFERÊNCIA|ERITROGRAMA|LEUCOGRAMA|NOTAS?|Bibliografia|Observações?|Fator(?:es)? de [Cc]onversão|Perguntas frequentes|Referências bibliográficas|METABÓLITOS|DISTÚRBIOS|ACIDEMIAS|AMINOÁCIDOS|AMINOACIDOPATIAS)/i.test(line) &&
      !/\d{2}\/\d{2}\/\d{4}/.test(line) &&
      // Valores qualitativos em maiúsculas não são títulos
      !/^(?:NORMAL|NEGATIVO|POSITIVO|REAGENTE|NÃO DETECTAD\w*|DETECTADO|INCONCLUSIVO|PERFIL SEM ALTERAÇÕES)\b/i.test(line) &&
      // Números puros/valores não são títulos (case-sensitive: "17 ALPHA-OH..." passa)
      !/^\d[\d.,><≥≤]*\s*(?:$|[a-z\/µ°³])/.test(line)

    if (isHeaderCandidate && !/[:]/.test(line.slice(0, 30))) {
      pendingTitleLines.push(line)
      current = null
      continue
    }

    if (/^Material:/i.test(line)) {
      current = { title: pendingTitleLines.join(' ') || '(sem título)', body: '', collectedAt: undefined }
      sections.push(current)
      pendingTitleLines = []
      continue
    }

    if (current) {
      const m = line.match(/^Coleta:\s*(.*)$/i)
      if (m && m[1]) {
        const d = parseBrazilianDateTime(m[1])
        if (d) current.collectedAt = d
        continue
      }
      if (/^Coleta:$/i.test(line)) continue // data vem na próxima linha
      // Data de coleta órfã (linha seguinte a "Coleta:")
      if (!current.collectedAt && /^\d{2}\/\d{2}\/\d{4}/.test(line)) {
        const d = parseBrazilianDateTime(line)
        if (d) {
          current.collectedAt = d
          continue
        }
      }
      current.body += `${line}\n`
    }
  }

  return sections.filter((s) => s.body.trim().length > 0 || s.title !== '(sem título)')
}

/** Extrai "RESULTADO:" (mesma linha ou linhas seguintes até Valor de Referência). */
function extractResultBlock(body: string): { value: string; unit?: string; ref?: string } | null {
  const lines = body.split('\n').map((l) => l.trim()).filter(Boolean)
  const idx = lines.findIndex((l) => /^RESULTADO:?$/i.test(l) || /^RESULTADO:\s*.+/i.test(l))
  if (idx === -1) return null

  // Valor pode estar na mesma linha ou nas próximas (até 3 linhas: valor + unidade)
  let valueParts: string[] = []
  let ref: string | undefined
  for (let i = idx; i < Math.min(lines.length, idx + 6); i++) {
    const l = lines[i]
    if (/^VALOR DE REFERÊNCIA:?$/i.test(l)) {
      ref = lines[i + 1]
      break
    }
    const inlineRef = l.match(/^VALOR DE REFERÊNCIA:\s*(.+)$/i)
    if (inlineRef) {
      ref = inlineRef[1]
      break
    }
    if (i > idx) valueParts.push(l.trim())
    else {
      const sameLine = l.match(/^RESULTADO:\s*(.+)$/i)
      if (sameLine) valueParts.push(sameLine[1].trim())
    }
  }

  const value = valueParts.join(' ').replace(/\s+/g, ' ').trim()
  if (!value) return null
  return { value, ref: ref?.trim() }
}

/** Padrão "ANALITO....:
valor
ref" (Hemograma e afins). Unidade vem inline no valor ("11,6 g/dL"). */
function extractDotAlignedEntries(body: string): Array<{ name: string; value: string; unit?: string; ref?: string }> {
  const entries: Array<{ name: string; value: string; unit?: string; ref?: string }> = []
  const lines = body.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const inline = lines[i].match(/^([A-ZÀ-Ú][A-Za-zÀ-ú\s]*?)[.:]+\s*(.*)$/u)
    if (!inline) continue
    const name = normalizeEntryName(inline[1])
    if (!name) continue

    // Valor: mesma linha ou a próxima
    let value = inline[2].trim()
    let cursor = i + 1
    if (!value && cursor < lines.length) {
      value = lines[cursor].trim()
      cursor++
    }
    if (!value) continue

    // Referência: primeira linha adiante com padrão "X a Y" / "Inferior a Z"
    // (pula contagens absolutas intermediárias tipo "1.080 /mm3")
    let ref: string | undefined
    for (let j = cursor; j < Math.min(lines.length, cursor + 4); j++) {
      const l = lines[j].trim()
      if (/^\d[\d.,]*\s*a\s*[\d.,]+/.test(l) || /^(?:inferior|superior|até)\s+a?\s*/i.test(l)) {
        ref = l
        break
      }
    }

    entries.push({ name, value, unit: undefined, ref })
  }
  return entries
}

function normalizeEntryName(rawDotsName: string): string {
  return rawDotsName.replace(/\.+\s*$/, '').trim()
}

const UNIT_RE = /(?:mg\/dL|g\/dL|mg\/L|%|fL|pg|mmol\/L|mcg\/dL|µg\/dL|ug\/dL|ng\/mL(?:\s+em\s+\w+)?|mcU\/mL(?:\s+em\s+\w+)?|mUI\/L|U\/L|U\/g\s*[\wáéíóúàâêã]*|milhões?\/mm³|\/mm3|cópias de \w+\/m[cu]L(?:\s+de\s+\w+)?)/i

/** Separa unidade do valor ("11,6 g/dL" → valor "11,6", unidade "g/dL"). */
function splitValueUnit(raw: string): { value: string; unit?: string } {
  const v = raw.replace(/\s+/g, ' ').trim()
  const m = v.match(new RegExp(`^([><≥≤]?\\s*[\\d.,]+)\\s*(${UNIT_RE.source})$`))
  if (m) return { value: m[1], unit: m[2].trim() }
  const unitOnly = v.match(UNIT_RE)
  if (unitOnly && /^[\d.,]/.test(v)) {
    return { value: v.slice(0, unitOnly.index).trim(), unit: unitOnly[0].trim() }
  }
  return { value: v }
}

function isUnitLike(s: string): boolean {
  if (!s) return false
  if (UNIT_RE.test(s)) return true
  return /^[\d.,]+\s*(mg|g|ml|mcl|µ|u|f|p|%|\/)/i.test(s) && s.length < 40
}

function isRefLike(s: string): boolean {
  if (!s) return false
  return /\d/.test(s) || /inferior a|superior a|até/i.test(s)
}

/** Status comparando valor numérico com faixa de referência simples ("De X a Y", "Inferior a Z", "Até Z"). */
function computeStatus(numVal: number | undefined, ref: string | undefined): 'normal' | 'altered' {
  if (numVal == null || !ref) return 'normal'
  const range = ref.match(/(?:de\s*)?([\d.,]+)\s*a\s*([\d.,]+)/i)
  if (range) {
    const lo = parseNumericValue(range[1])
    const hi = parseNumericValue(range[2])
    if (lo != null && hi != null) return numVal < lo || numVal > hi ? 'altered' : 'normal'
  }
  const max = ref.match(/(?:inferior a|até|menor que)\s*([\d.,]+)/i)
  if (max) {
    const hi = parseNumericValue(max[1])
    if (hi != null) return numVal > hi ? 'altered' : 'normal'
  }
  const min = ref.match(/superior a\s*([\d.,]+)/i)
  if (min) {
    const lo = parseNumericValue(min[1])
    if (lo != null) return numVal < lo ? 'altered' : 'normal'
  }
  return 'normal'
}

/** Detecta qualitativo (Detectado/Não Detectado/NEGATIVO/NORMAL...). */
function qualitativeStatus(value: string): { display: string; status: 'normal' | 'altered' } | null {
  const v = value.trim()
  if (/^não\s+detectad/i.test(v) || /^negativ/i.test(v) || /^normal$|^perfil sem alteraç|^padrão normal/i.test(v)) {
    return { display: v, status: 'normal' }
  }
  if (/^detectad/i.test(v) || /^positiv/i.test(v) || /^reagent/i.test(v) || /alteraç/i.test(v)) {
    return { display: v, status: 'altered' }
  }
  return null
}

// ─────────────────────────── Hemograma ───────────────────────────

const HEMOGRAMA_ENTRY_MAP: Record<string, { popular: string; technical?: string }> = {
  'Hemácias': { popular: 'Hemácias (Vermelhas)', technical: 'Eritrócitos' },
  'Hemoglobina': { popular: 'Hemoglobina' },
  'Hematócrito': { popular: 'Hematócrito' },
  'MCV': { popular: 'MCV (Volume Globular Médio)', technical: 'VCM' },
  'MCH': { popular: 'MCH (Hemoglobina Corpuscular Média)', technical: 'HCM' },
  'MCHC': { popular: 'MCHC (Concentração de Hemoglobina)', technical: 'CHCM' },
  'RDW': { popular: 'RDW (Amplitude de Distribuição das Hemácias)' },
  'Leucócitos': { popular: 'Leucócitos' },
  'Blastos': { popular: 'Blastos' },
  'Promielócitos': { popular: 'Promielócitos' },
  'Mielócitos': { popular: 'Mielócitos' },
  'Metamielócitos': { popular: 'Metamielócitos' },
  'Bastonetes': { popular: 'Bastonetes' },
  'Segmentados': { popular: 'Neutrófilos Segmentados' },
  'Eosinófilos': { popular: 'Eosinófilos' },
  'Basófilos': { popular: 'Basófilos' },
  'Linfócitos Reativos': { popular: 'Linfócitos Reativos' },
  'Linfócitos': { popular: 'Linfócitos' },
  'Monócitos': { popular: 'Monócitos' },
  'Plaquetas': { popular: 'Plaquetas' },
}

// ─────────────────────── Triagem Neonatal (mapa título→marcador) ───────────────────────

interface NeonatalSpec {
  /** Regex sobre o título da seção. */
  titleRe: RegExp
  markerName: string
  technicalName?: string
  /** Onde está o resultado no corpo. */
  resultLabelRe?: RegExp
}

const NEONATAL_SPECS: NeonatalSpec[] = [
  {
    titleRe: /FENILALANINA\s+PLASMÁTICA/i,
    markerName: 'Fenilalanina',
    technicalName: 'Triagem Neonatal - Fenilcetonúria (PKU)',
    resultLabelRe: /^FENILALANINA:\s*(.+)$/im,
  },
  {
    titleRe: /HIPOTIREOIDISMO\s+CONGÊNITO|TIREOTROPINA\s*\(TSH\)\s*NEONATAL/i,
    markerName: 'TSH Neonatal',
    technicalName: 'Hipotireoidismo Congênito - TSH',
    resultLabelRe: /^TIREOTROPINA\s*\(TSH\)\s*NEONATAL:\s*(.+)$/im,
  },
  {
    titleRe: /TIROXINA\s*\(T4\)\s*NEONATAL/i,
    markerName: 'T4 Neonatal',
    technicalName: 'Hipotireoidismo Congênito - T4',
  },
  {
    titleRe: /HEMOGLOBINOPATIAS/i,
    markerName: 'Hemoglobinopatias (Fenótipo)',
    technicalName: 'Pesquisa de Hemoglobinopatias - HPLC',
    resultLabelRe: /^FENOTIPO AVALIADO:\s*([\s\S]+?)(?:\n\s*\n|$)/im,
  },
  {
    titleRe: /TRIPSINA\s+IMUNO\s*REATIVA/i,
    markerName: 'Tripsina Imuno Reativa (IRT)',
    technicalName: 'Fibrose Cística - IRT',
  },
  {
    titleRe: /17\s*ALPHA-OH-PROGESTERONA|17-ALFA-HIDROXIPROGESTERONA|17-OH-PROGESTERONA/i,
    markerName: '17-OH-Progesterona',
    technicalName: 'Hiperplasia Adrenal Congênita',
  },
  {
    titleRe: /BIOTINIDASE/i,
    markerName: 'Biotinidase (Atividade)',
    technicalName: 'Deficiência de Biotinidase',
  },
  {
    titleRe: /TOXOPLASMA/i,
    markerName: 'Toxoplasmose IgM (Neonatal)',
    technicalName: 'Anticorpo IgM Anti-Toxoplasma Gondii',
  },
  {
    titleRe: /AMINOÁCIDOS/i,
    markerName: 'Aminoácidos (Perfil Qualitativo)',
    technicalName: 'Análise Qualitativa de Aminoácidos - MS/MS',
  },
  {
    titleRe: /GALACTOSE\s+TOTAL/i,
    markerName: 'Galactose Total',
    technicalName: 'Galactosemia',
  },
  {
    titleRe: /GLICOSE\s*6[\s\-–]*FOSFATO\s+DE[HI]IDROGENASE|G6PD/i,
    markerName: 'G6PD (Glicose-6-Fosfato Desidrogenase)',
    technicalName: 'Deficiência de G6PD / Favismo',
  },
  {
    titleRe: /ACILCARNITINAS/i,
    markerName: 'Acilcarnitinas (Perfil)',
    technicalName: 'Avaliação Qualitativa das Acilcarnitinas - MS/MS',
  },
  {
    titleRe: /TREC/i,
    markerName: 'TREC (Imunodeficiência SCID)',
    technicalName: 'Detecção de Cópias TREC',
  },
  {
    titleRe: /KREC/i,
    markerName: 'KREC (Agamaglobulinemia)',
    technicalName: 'Detecção de Cópias KREC',
  },
]

export class MaterDeiPdfReportParser implements ExamReportParser {
  readonly sourceId = 'mater-dei'

  canHandle(hint: string): boolean {
    return /mater\s*dei|materdei/i.test(hint)
  }

  parse(fullText: string): MaterDeiPdfParseResult {
    const markers: ExtractedExamMarkerItem[] = []

    // Metadados globais (paciente/médico/pedido/coleta) — primeira ocorrência
    const patientMatch = fullText.match(/^Nome:\s*\n(.+)$/m)
    const doctorMatch = fullText.match(/Médico\.+\s*:\s*\n?(.+)/m)
    const orderMatch = fullText.match(/Pedido\.+\s*:\s*\n?(.+)/m)
    let globalCollected: Date | undefined
    const coletaMatches = fullText.matchAll(/Coleta:?\s*\n?(\d{2}\/\d{2}\/\d{4}[^\n]*)/g)
    for (const m of coletaMatches) {
      const d = parseBrazilianDateTime(m[1])
      if (d) {
        globalCollected = d
        break
      }
    }

    const sections = splitIntoSections(fullText)

    for (const section of sections) {
      const collectedAt = section.collectedAt ?? globalCollected ?? new Date()
      markers.push(...this.parseSection(section, collectedAt))
    }

    return {
      patientName: patientMatch?.[1]?.trim(),
      doctorName: doctorMatch?.[1]?.trim(),
      orderNumber: orderMatch?.[1]?.trim(),
      collectedAt: globalCollected,
      markers,
    }
  }

  private parseSection(section: ReportSection, collectedAt: Date): ExtractedExamMarkerItem[] {
    const title = section.title.toUpperCase()
    const out: ExtractedExamMarkerItem[] = []

    // ── Hemograma (estrutura pontilhada ERITROGRAMA/LEUCOGRAMA) ──
    if (/^HEMOGRAMA\b/.test(title)) {
      out.push(...this.parseHemograma(section.body, collectedAt))
      return out
    }

    // ── Triagem neonatal por especificação ──
    const spec = NEONATAL_SPECS.find((s) => s.titleRe.test(title))
    if (spec) {
      const item = this.parseWithSpec(section.body, spec, collectedAt)
      if (item) out.push(item)
      return out
    }

    // ── Painéis virais / PCR / Glicose (estrutura RESULTADO:) ──
    out.push(...this.parseGenericLabSection(section.title, section.body, collectedAt))
    return out
  }

  private parseHemograma(body: string, collectedAt: Date): ExtractedExamMarkerItem[] {
    const out: ExtractedExamMarkerItem[] = []
    const entries = extractDotAlignedEntries(body)
    for (const entry of entries) {
      const mapped = HEMOGRAMA_ENTRY_MAP[entry.name] ?? HEMOGRAMA_ENTRY_MAP[entry.name.replace(/\s+/g, ' ')]
      if (!mapped) continue
      const { value, unit } = splitValueUnit(entry.value)
      const numeric = parseNumericValue(value)
      const status = computeStatus(numeric, entry.ref)
      out.push({
        markerName: mapped.popular,
        technicalName: mapped.technical,
        numericValue: numeric,
        displayValue: value,
        unit,
        referenceRange: entry.ref,
        status,
        collectedAt,
      })
    }
    return out
  }

  private parseWithSpec(body: string, spec: NeonatalSpec, collectedAt: Date): ExtractedExamMarkerItem | null {
    // Resultado rotulado (ex.: "FENILALANINA:\n0,7\nmg/dL")
    if (spec.resultLabelRe) {
      const m = body.match(spec.resultLabelRe)
      if (m) {
        const value = this.grabValueWithUnit(body, m[1])
        return this.buildMarkerFromValue(value, body, spec, collectedAt)
      }
    }

    // RESULTADO genérico dentro do bloco
    const res = extractResultBlock(body)
    if (res) {
      return this.buildMarkerFromValue(res.value, body, spec, collectedAt, res.ref)
    }
    return null
  }

  /** Junta o valor com a linha seguinte se ela for unidade ("0,7" + "mg/dL"). */
  private grabValueWithUnit(body: string, firstPart: string): string {
    const first = firstPart.replace(/\n/g, ' ').trim()
    if (UNIT_RE.test(first)) return first
    // Procura a linha do match no corpo e olha a próxima
    const lines = body.split('\n').map((l) => l.trim())
    const idx = lines.findIndex((l) => l === first)
    if (idx >= 0 && idx + 1 < lines.length) {
      const next = lines[idx + 1]
      if (next && !/^valor de refer/i.test(next) && UNIT_RE.test(next)) {
        return `${first} ${next}`
      }
    }
    return first
  }

  private buildMarkerFromValue(
    value: string,
    body: string,
    spec: NeonatalSpec,
    collectedAt: Date,
    explicitRef?: string,
  ): ExtractedExamMarkerItem | null {
    if (!value) return null

    const qual = qualitativeStatus(value)
    const refMatch = explicitRef ?? this.findReference(body)
    if (qual) {
      return {
        markerName: spec.markerName,
        technicalName: spec.technicalName,
        numericValue: undefined,
        displayValue: qual.display,
        unit: undefined,
        referenceRange: refMatch,
        status: qual.status,
        collectedAt,
      }
    }
    const { value: valOnly, unit } = splitValueUnit(value)
    const numeric = parseNumericValue(valOnly)
    const status = computeStatus(numeric, refMatch)

    return {
      markerName: spec.markerName,
      technicalName: spec.technicalName,
      numericValue: numeric,
      displayValue: valOnly || value,
      unit: unit ?? this.extractUnit(value, body),
      referenceRange: refMatch,
      status,
      collectedAt,
    }
  }

  private findReference(body: string): string | undefined {
    const m = body.match(/Valor de Referência:\s*\n?([^\n]+)/i)
    return m?.[1]?.trim() || undefined
  }

  private extractUnit(value: string, body: string): string | undefined {
    const inline = value.match(/(mg\/dL|g\/dL|mcg\/dL|µg\/dL|ug\/dL|ng\/mL[^ ]*|mcU\/mL[^ ]*|U\/g[^ ]*|mmol\/L|mcmol\/L|milhões\/mm³|%|\/mm³)/i)
    if (inline) return inline[1]
    const firstLine = body.split('\n').find((l) => l.trim())
    void firstLine
    return undefined
  }

  /**
   * Seções laboratoriais genéricas com bloco RESULTADO:
   * (PCR, Glicose, COVID, Influenza, RSV, Procalcitonina, Hemocultura…)
   */
  private parseGenericLabSection(title: string, body: string, collectedAt: Date): ExtractedExamMarkerItem[] {
    const out: ExtractedExamMarkerItem[] = []

    // Identifica analito conhecido pelo título (sem [\s\S]*? atravessando seções!)
    const analyte = this.identifyAnalyte(title)
    if (!analyte) return out

    const res = extractResultBlock(body)
    if (!res) return out

    const qual = qualitativeStatus(res.value)
    const ref = res.ref ?? analyte.defaultRef
    if (qual) {
      out.push({
        markerName: analyte.markerName,
        technicalName: analyte.technicalName,
        numericValue: undefined,
        displayValue: qual.display,
        unit: undefined,
        referenceRange: ref,
        status: qual.status,
        collectedAt,
      })
      return out
    }

    const { value: valOnly, unit } = splitValueUnit(res.value)
    const numeric = parseNumericValue(valOnly.split(/\s+/)[0])
    const status = computeStatus(numeric, ref)

    out.push({
      markerName: analyte.markerName,
      technicalName: analyte.technicalName,
      numericValue: numeric,
      displayValue: valOnly || res.value,
      unit: unit ?? analyte.defaultUnit,
      referenceRange: ref,
      status,
      collectedAt,
    })
    return out
  }

  private identifyAnalyte(title: string): AnalyteSpec | null {
    if (/PROTE[IÍ]NA\s+C\s+REATIVA|\bPCR\b/.test(title)) {
      return {
        markerName: 'Proteína C Reativa',
        technicalName: 'PCR - TUSS 40304361',
        unitRe: /(mg\/L)/i,
        defaultUnit: 'mg/L',
      }
    }
    // GLICOSE simples ≠ GLICOSE 6-FOSFATO (que é tratado na triagem neonatal)
    if (/^GLICOSE(?!\s*6[\s\-–]?FOSFATO)(?!\s*6-)/.test(title.trim())) {
      return {
        markerName: 'Glicose de Jejum',
        technicalName: 'Glicemia em soro/plasma - TUSS 40302016',
        unitRe: /(mg\/dL)/i,
        defaultUnit: 'mg/dL',
      }
    }
    if (/CORONAV[IÍ]RUS|COVID/.test(title)) {
      return {
        markerName: 'COVID-19 (RT-PCR)',
        technicalName: 'SARS-CoV-2 Diagnóstico Molecular',
        unitRe: /(nunca)/i,
        defaultUnit: undefined,
      }
    }
    if (/INFLUENZA\s+A\s*\+\s*B/.test(title)) {
      return {
        markerName: 'Influenza A + B (Teste Rápido)',
        technicalName: 'Pesquisa Rápida Vírus Influenza',
        unitRe: /(nunca)/i,
        defaultUnit: undefined,
      }
    }
    if (/VIRUS\s+SINCICIAL|RSV/.test(title)) {
      return {
        markerName: 'Vírus Sincicial Respiratório (RSV)',
        technicalName: 'RSV Molecular',
        unitRe: /(nunca)/i,
        defaultUnit: undefined,
      }
    }
    if (/PROCALCITONINA/.test(title)) {
      return {
        markerName: 'Procalcitonina',
        technicalName: 'PCT',
        unitRe: /(ng\/mL)/i,
        defaultUnit: 'ng/mL',
      }
    }
    if (/HEMOCULTURA/.test(title)) {
      return {
        markerName: 'Hemocultura',
        technicalName: 'Pesquisa de bactérias no sangue',
        unitRe: /(nunca)/i,
        defaultUnit: undefined,
      }
    }
    if (/GRAM|BACTERIOSCOPIA/.test(title)) {
      return {
        markerName: 'Bacterioscopia (Gram)',
        technicalName: 'Gram Direto',
        unitRe: /(nunca)/i,
        defaultUnit: undefined,
      }
    }
    return null
  }
}

interface AnalyteSpec {
  markerName: string
  technicalName: string
  unitRe: RegExp
  defaultUnit?: string
  defaultRef?: string
}
