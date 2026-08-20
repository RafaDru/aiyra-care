import { describe, expect, it } from 'vitest'
import { HermesPardiniPdfReportParser } from '../src/infrastructure/ocr/hermes-pardini-pdf.parser.js'

describe('HermesPardiniPdfReportParser', () => {
  const samplePdfText = `
RAFAEL DRUMMOND FERREIRA REIS
05/04/1984 (42 anos)
THAMIRES DA SILVA ROSA - CRM-MG 68377
08/08/2026 1244885-DOM
HEMOGRAMA
[DATA DA COLETA : 08/08/2026 07:28] Coleta de amostra realizada pela equipe do laboratório
MATERIAL - SANGUE

RESULTADOS ANTERIORES  04/09/24 09:33  13/04/21 09:23  10/04/21 11:35
Hemacias  4.500.000  4.960.000  4.740.000
Hematocrito  41,0  44,7  43,1
Hemoglobina  13,8  15,1  14,4
Leucocitos  5.710  8.070  6.290
Plaquetas  212.000  220.000  215.000

VITAMINA B12
[DATA DA COLETA : 08/08/2026 07:28]
RESULTADO: 401 pg/mL
VALOR DE REFERÊNCIA: DE 172 A 890 pg/mL

GLICOSE JEJUM (FLUORETO)
[DATA DA COLETA : 08/08/2026 07:28]
RESULTADO: 80 mg/dL
VALORES DE REFERÊNCIA: DE 60 A 99 mg/dL

TSH ULTRA SENSÍVEL
[DATA DA COLETA : 08/08/2026 07:28]
RESULTADO: 2,16 microUI/mL
  `

  it('parses patient metadata and current exam markers', () => {
    const parser = new HermesPardiniPdfReportParser()
    const result = parser.parse(samplePdfText)

    expect(result.patientName).toContain('RAFAEL DRUMMOND')
    expect(result.doctorName).toContain('THAMIRES')
    expect(result.orderNumber).toBe('1244885-DOM')

    const b12 = result.markers.find((m) => m.markerName === 'Vitamina B12')
    expect(b12).toBeDefined()
    expect(b12?.numericValue).toBe(401)
    expect(b12?.unit).toBe('pg/mL')

    const glicose = result.markers.find((m) => m.markerName === 'Glicose de Jejum')
    expect(glicose).toBeDefined()
    expect(glicose?.numericValue).toBe(80)
  })

  it('parses "RESULTADOS ANTERIORES" table with historical dates and values', () => {
    const parser = new HermesPardiniPdfReportParser()
    const result = parser.parse(samplePdfText)

    const historicalHemacias = result.markers.filter((m) => m.markerName === 'Hemácias' && m.isHistorical)
    expect(historicalHemacias.length).toBe(3)

    const firstHist = historicalHemacias[0]
    expect(firstHist.displayValue).toBe('4.500.000')
    expect(firstHist.collectedAt.getFullYear()).toBe(2024)
    expect(firstHist.collectedAt.getMonth()).toBe(8) // Setembro (month index 8)
  })
})
