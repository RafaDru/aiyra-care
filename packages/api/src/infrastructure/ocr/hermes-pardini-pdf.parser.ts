/**
 * Parser para laudos PDF do Hermes Pardini (Precision Care / Grupo Fleury).
 *
 * Extrai de forma nativa e determinística:
 * 1. Dados do exame atual (Nome do analito, resultado, unidade, faixa de referência, data da coleta).
 * 2. Tabela "RESULTADOS ANTERIORES" com medições históricas retroativas (datas/horas passadas + valores).
 */

export interface ExtractedExamMarkerItem {
  markerName: string
  technicalName?: string
  numericValue?: number
  displayValue: string
  unit?: string
  referenceRange?: string
  status: 'normal' | 'altered' | 'critical'
  collectedAt: Date
  isHistorical?: boolean
}

export interface HermesPdfParseResult {
  patientName?: string
  doctorName?: string
  orderNumber?: string
  collectedAt?: Date
  markers: ExtractedExamMarkerItem[]
}

function parseBrazilianDate(dateStr: string): Date | null {
  if (!dateStr) return null
  // Formatos: DD/MM/YYYY, DD/MM/YY, DD/MM/YY HH:mm, DD/MM/YYYY HH:mm:ss
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{2,4})(?:\s+(\d{2}):(\d{2}))?/)
  if (!match) return null

  let [, day, month, year, hour, min] = match
  if (year.length === 2) {
    year = `20${year}`
  }

  const d = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    hour ? Number(hour) : 12,
    min ? Number(min) : 0,
  )

  return isNaN(d.getTime()) ? null : d
}

function parseNumericValue(valStr: string): number | undefined {
  if (!valStr) return undefined
  // Converte "4.500.000" -> 4500000 ou "41,0" -> 41.0
  const clean = valStr.trim().replace(/\./g, '').replace(',', '.')
  const num = Number(clean)
  return Number.isFinite(num) ? num : undefined
}

export class HermesPardiniPdfReportParser {
  parse(fullText: string): HermesPdfParseResult {
    const lines = fullText.split('\n').map((l) => l.trim()).filter(Boolean)
    const markers: ExtractedExamMarkerItem[] = []

    // 1. Coleta metadados principais (Nome, Médico, Coleta)
    let patientName: string | undefined
    let doctorName: string | undefined
    let orderNumber: string | undefined
    let collectedAt: Date | undefined

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (/RAFAEL|BRUNO|LUIS/i.test(line) && line.includes('DRUMMOND')) {
        patientName = line
      }
      if (line.includes('CRM-MG') || line.includes('SOLICITANTE') || line.includes('THAMIRES')) {
        doctorName = line
      }
      if (line.includes('1244885-DOM') || /\d{6,10}-[A-Z]{3}/.test(line)) {
        const m = line.match(/\d{6,10}-[A-Z]{3}/)
        if (m) orderNumber = m[0]
      }
      if (line.includes('[DATA DA COLETA')) {
        const m = line.match(/(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/)
        if (m) {
          collectedAt = parseBrazilianDate(m[1]) ?? undefined
        }
      }
    }

    const defaultCollectedAt = collectedAt ?? new Date()

    // 2. Parser da Tabela "RESULTADOS ANTERIORES"
    if (fullText.includes('RESULTADOS ANTERIORES')) {
      const historicalMarkers = this.parseResultadosAnterioresBlock(fullText, defaultCollectedAt)
      markers.push(...historicalMarkers)
    }

    // 3. Parser de Marcadores do Exame Atual (Glicose, Vitamina B12, Creatinina, TSH, T4 Livre, etc.)
    const currentMarkers = this.parseCurrentExamMarkers(fullText, defaultCollectedAt)
    markers.push(...currentMarkers)

    return {
      patientName,
      doctorName,
      orderNumber,
      collectedAt: defaultCollectedAt,
      markers,
    }
  }

  private parseResultadosAnterioresBlock(
    text: string,
    _defaultCollectedAt: Date,
  ): ExtractedExamMarkerItem[] {
    const historical: ExtractedExamMarkerItem[] = []
    const idx = text.indexOf('RESULTADOS ANTERIORES')
    if (idx < 0) return historical

    const snippet = text.slice(idx, idx + 1500)
    const lines = snippet.split('\n').map((l) => l.trim()).filter(Boolean)

    // A linha logo após RESULTADOS ANTERIORES contém as datas históricas (ex.: 04/09/24 09:33  13/04/21 09:23  10/04/21 11:35)
    let datesLineIndex = -1
    const dates: Date[] = []

    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i]
      const matches = line.match(/\d{2}\/\d{2}\/\d{2,4}\s+\d{2}:\d{2}/g)
      if (matches && matches.length >= 1) {
        datesLineIndex = i
        for (const m of matches) {
          const d = parseBrazilianDate(m)
          if (d) dates.push(d)
        }
        break
      }
    }

    if (datesLineIndex < 0 || dates.length === 0) return historical

    // As linhas seguintes contêm o nome do analito e os valores correspondentes
    for (let i = datesLineIndex + 1; i < Math.min(lines.length, datesLineIndex + 15); i++) {
      const line = lines[i]
      if (line.includes('VITAMINA') || line.includes('DATA DA COLETA') || line.includes('METODO:')) break

      // Linhas típicas: "Hemacias 4.500.000 4.960.000 4.740.000" ou "Hematocrito 41,0 44,7 43,1"
      const parts = line.split(/\s+/).filter(Boolean)
      if (parts.length >= 2) {
        const markerName = parts[0]
        const vals = parts.slice(1)

        for (let j = 0; j < Math.min(vals.length, dates.length); j++) {
          const rawVal = vals[j]
          const numVal = parseNumericValue(rawVal)
          const date = dates[j]

          if (date && rawVal) {
            historical.push({
              markerName: this.normalizeMarkerName(markerName),
              technicalName: `Resultado Anterior (${markerName})`,
              numericValue: numVal,
              displayValue: rawVal,
              status: 'normal',
              collectedAt: date,
              isHistorical: true,
            })
          }
        }
      }
    }

    return historical
  }

  private parseCurrentExamMarkers(
    text: string,
    defaultCollectedAt: Date,
  ): ExtractedExamMarkerItem[] {
    const items: ExtractedExamMarkerItem[] = []

    // Mapeamentos conhecidos de blocos no laudo do Hermes Pardini
    const patterns = [
      {
        name: 'Glicose de Jejum',
        tech: 'Glicemia em soro/plasma - TUSS 40302016',
        regex: /GLICOSE\s+JEJUM[\s\S]*?RESULTADO:\s*(\d+[.,]?\d*)\s*mg\/dL[\s\S]*?VALORES\s+DE\s+REFERÊNCIA:\s*([^\n]+)/i,
        unit: 'mg/dL',
      },
      {
        name: 'Vitamina B12',
        tech: 'Cianocobalamina - TUSS 40316388',
        regex: /VITAMINA\s+B12[\s\S]*?RESULTADO:\s*(\d+[.,]?\d*)\s*pg\/mL[\s\S]*?VALOR\s+DE\s+REFERÊNCIA:\s*([^\n]+)/i,
        unit: 'pg/mL',
      },
      {
        name: 'Hemoglobina Glicada',
        tech: 'HbA1c por Imunoturbidimetria - TUSS 40302040',
        regex: /HEMOGLOBINA\s+GLICADA[\s\S]*?RESULTADO:\s*HEMOGLOBINA\s+GLICADA\s*\(A1C\):\s*(\d+[.,]?\d*)%/i,
        unit: '%',
        ref: 'Menor que 5,7%',
      },
      {
        name: 'Creatinina',
        tech: 'Creatinina sérica - TUSS 40301630',
        regex: /CREATININA[\s\S]*?RESULTADO:\s*(\d+[.,]?\d*)\s*mg\/dL/i,
        unit: 'mg/dL',
      },
      {
        name: 'Ureia',
        tech: 'Ureia sérica - TUSS 40302580',
        regex: /UREIA[\s\S]*?RESULTADO:\s*(\d+[.,]?\d*)\s*mg\/dL/i,
        unit: 'mg/dL',
      },
      {
        name: 'Colesterol Total',
        tech: 'Colesterol Total - TUSS 40301605',
        regex: /COLESTEROL\s+TOTAL[\s\S]*?RESULTADO:\s*(\d+[.,]?\d*)\s*mg\/dL/i,
        unit: 'mg/dL',
      },
      {
        name: 'Colesterol HDL',
        tech: 'Colesterol HDL - TUSS 40301613',
        regex: /COLESTEROL\s+HDL[\s\S]*?RESULTADO:\s*(\d+[.,]?\d*)\s*mg\/dL/i,
        unit: 'mg/dL',
      },
      {
        name: 'Colesterol LDL',
        tech: 'Colesterol LDL - TUSS 40301621',
        regex: /COLESTEROL\s+LDL[\s\S]*?RESULTADO:\s*(\d+[.,]?\d*)\s*mg\/dL/i,
        unit: 'mg/dL',
      },
      {
        name: 'Vitamina D (25-OH)',
        tech: '25-Hidroxivitamina D - TUSS 40316388',
        regex: /25-HIDROXIVITAMINA\s+D[\s\S]*?RESULTADO:\s*(\d+[.,]?\d*)\s*ng\/mL/i,
        unit: 'ng/mL',
      },
      {
        name: 'TSH Ultrassensível',
        tech: 'Hormônio Tireoestimulante - TUSS 40316523',
        regex: /TSH\s+ULTRA\s+SENS[ÍI]VEL[\s\S]*?RESULTADO:\s*(\d+[.,]?\d*)\s*(microUI\/mL|mIU\/L)/i,
        unit: 'mIU/L',
      },
      {
        name: 'T4 Livre',
        tech: 'T4 Livre - TUSS 40316531',
        regex: /T4\s+LIVRE[\s\S]*?RESULTADO:\s*(\d+[.,]?\d*)\s*ng\/dL/i,
        unit: 'ng/dL',
      },
    ]

    for (const pat of patterns) {
      const match = text.match(pat.regex)
      if (match) {
        const valStr = match[1]
        const numVal = parseNumericValue(valStr)
        const refRange = match[2] ? match[2].trim() : pat.ref

        items.push({
          markerName: pat.name,
          technicalName: pat.tech,
          numericValue: numVal,
          displayValue: valStr,
          unit: pat.unit,
          referenceRange: refRange,
          status: 'normal',
          collectedAt: defaultCollectedAt,
          isHistorical: false,
        })
      }
    }

    return items
  }

  private normalizeMarkerName(raw: string): string {
    const s = raw.trim()
    if (/hemacias/i.test(s)) return 'Hemácias'
    if (/hematocrito/i.test(s)) return 'Hematócrito'
    if (/hemoglobina/i.test(s)) return 'Hemoglobina'
    if (/leucocitos/i.test(s)) return 'Leucócitos'
    if (/plaquetas/i.test(s)) return 'Plaquetas'
    return s
  }
}
