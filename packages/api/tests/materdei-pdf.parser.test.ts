import { describe, expect, it } from 'vitest'
import { MaterDeiPdfReportParser, splitIntoSections } from '../src/infrastructure/ocr/materdei-pdf.parser.js'

const HEMOGRAMA_SAMPLE = `HEMOGRAMA

Material:
Sangue
Coleta:
06/12/2022 - 16:24:19
Liberação: 06/12/2022
Método:
Citometria de Fluxo

ERITROGRAMA
Valor de referência:

Hemácias...........:
3,52 milhões/mm³
3,0 a 5,4 milhões/mm³
Hemoglobina........:
11,6 g/dL
11,5 a 16,5 g/dL
Hematócrito........:
32,3 %
33,0 a 53,0 %
MCV:...............:
91,8 fL
92,0 a 116,0 fL
RDW................:
15,0 %
11,6 a 14,0 %

LEUCOGRAMA
Valor de referência:

Leucócitos.........:
9.000 /mm3
5.000 a 19.000 /mm³

Segmentados........:
12,0 %
1.080 /mm3

3.000 a 9.000 /mm³
Linfócitos.........:
76,0 %
6.840 /mm3

3.000 a 16.000 /mm³
Monócitos..........:
9,0 %
810 /mm3

300 a 1.000 /mm³


Plaquetas..........:
610.000 /mm3
210.000 a 650.000 /mm³

Observações:
Presença de plaquetas gigantes

______________________________________________________________________________________________
Nome:
BRUNO DRUMMOND FREITAS REIS
Data de nascimento:
26/10/2022
Pedido............:
6182926
Data pedido:
06/12/2022
O.S:014-66449-764
Médico............:
82246 - JOSE ABRANTES PEGO NETO
1/1`

const NEONATAL_COMPILED = `FENILALANINA PLASMÁTICA

Material:
Sangue total em papel filtro
Coleta:
31/10/2022 - 11:18:44
Liberação:
04/11/2022
Método:
Cromatografia Líquida/Espectrometria de Massas em Tandem (LC-MS/MS)

FENILALANINA:
0,7
mg/dL


Valor de Referência:
Normal: Até 2,2 mg/dL

Nome:
BRUNO DRUMMOND FREITAS REIS
1/1

PESQUISA DE HIPOTIREOIDISMO CONGÊNITO

Material:
Sangue total em papel filtro
Coleta:
31/10/2022 - 11:18:44
Método:
Imunofluorimétrico

TIREOTROPINA (TSH) NEONATAL:
2.08
mcU/mL em sangue


Valor de Referência:
Até 7 dias: até 15 mcU/mL em sangue

Nome:
BRUNO DRUMMOND FREITAS REIS
1/1

TRIPSINA IMUNO REATIVA (IRT)

Material:
Sangue total em papel filtro
Coleta:
31/10/2022 - 11:18:44
Método:
Imunofluorimétrico

RESULTADO:
5,2
ng/mL em sangue


Valor de Referência:
Até 14 dias : até 90,00 ng/mL em sangue

Nome:
BRUNO DRUMMOND FREITAS REIS
1/1

17 ALPHA-OH-PROGESTERONA NEONATAL

Material:
Sangue total em papel filtro
Coleta:
31/10/2022 - 11:18:44
Método:
Imunofluorimétrico

RESULTADO:
3.01
ng/mL em sangue


Valor de Referência:
RN a termo ou > 2500g....: até 15 ng/mL em sangue

Nome:
BRUNO DRUMMOND FREITAS REIS
1/1

ATIVIDADE ENZIMÁTICA DA BIOTINIDASE

Material:
Sangue total em papel filtro
Coleta:
31/10/2022 - 11:18:44
Método:
Fluorimétrico

RESULTADO:
NORMAL


Valor de Referência:
Normal

Nome:
BRUNO DRUMMOND FREITAS REIS
1/1

GALACTOSE TOTAL

Material:
Sangue total em papel filtro
Coleta:
31/10/2022 - 11:18:44
Método:
Fluorimétrico

RESULTADO:
2,1
mg/dL


Valor de Referência:
Até 9,00 mg/dL

Nome:
BRUNO DRUMMOND FREITAS REIS
1/1

GLICOSE 6- FOSFATO DEHIDROGENASE

Material:
Sangue total em papel filtro
Coleta:
31/10/2022 - 11:18:44
Método:
Fluorimétrico

RESULTADO:
7,0
U/g hemoglobina


Valor de Referência:
Normal: Superior a 2,4 U/g Hb

Nome:
BRUNO DRUMMOND FREITAS REIS
1/1`

const VIRAL_PANEL = `PROTEINA C REATIVA - PCR

Material:
Sangue
Coleta:
08/07/2026 - 21:59:34
Liberação:
08/07/2026
Método:
Imunocinética de ponto fixo - Química seca

RESULTADO:
22
mg/L


Valor de Referência:
Inferior a 10,0 mg/L

Nome:
BRUNO DRUMMOND FREITAS REIS
Pedido............:
18172437*9873406
1/1

INFLUENZA A + B (TESTE RÁPIDO)

Material:
Secreção nasal
Coleta: 08/07/2026 - 21:59:31
Liberação:08/07/2026
Método:
Imunoensaio

RESULTADO:
Não Detectado


Valor de Referência:
Não Detectado.

Nome:
BRUNO DRUMMOND FREITAS REIS
1/1

DIAGNÓSTICO MOLECULAR CORONAVÍRUS COVID-19

Material: Swab Nasal
Coleta:
08/07/2026 - 21:59:07
Liberação: 10/07/2026
Método:
RT-PCR (Reação em cadeia da polimerase) em tempo real

RESULTADO: Não detectado

Valor de Referência:
NÃO DETECTADO (NEGATIVO NA AMOSTRA ANALISADA).

Nome:
BRUNO DRUMMOND FREITAS REIS
1/2`

describe('MaterDeiPdfReportParser v2 (por seções)', () => {
  it('divide o laudo em seções por exame', () => {
    const sections = splitIntoSections(VIRAL_PANEL)
    expect(sections.length).toBe(3)
    expect(sections[0].title).toContain('PROTEINA C REATIVA')
    expect(sections[1].title).toContain('INFLUENZA')
    expect(sections[2].title).toContain('CORONAVÍRUS')
    // Seção da PCR não contém o corpo do bloco seguinte
    expect(sections[0].body).not.toContain('Não Detectado')
  })

  it('extrai painel viral (PCR alterada + Influenza/COVID não detectados) sem contaminação cruzada', () => {
    const parser = new MaterDeiPdfReportParser()
    const result = parser.parse(VIRAL_PANEL)

    const pcr = result.markers.find((m) => m.markerName === 'Proteína C Reativa')
    expect(pcr?.numericValue).toBe(22)
    expect(pcr?.status).toBe('altered')

    const flu = result.markers.find((m) => m.markerName === 'Influenza A + B (Teste Rápido)')
    expect(flu?.displayValue.toLowerCase()).toContain('não detectado')
    expect(flu?.numericValue).toBeUndefined()

    const covid = result.markers.find((m) => m.markerName === 'COVID-19 (RT-PCR)')
    expect(covid?.displayValue.toLowerCase()).toContain('não detectado')
    expect(result.markers.length).toBe(3)
  })

  it('extrai hemograma completo com unidades e status por faixa', () => {
    const parser = new MaterDeiPdfReportParser()
    const result = parser.parse(HEMOGRAMA_SAMPLE)

    const hgb = result.markers.find((m) => m.markerName === 'Hemoglobina')
    expect(hgb?.numericValue).toBe(11.6)
    expect(hgb?.unit).toBe('g/dL')
    expect(hgb?.referenceRange).toContain('11,5 a 16,5')
    expect(hgb?.status).toBe('normal')

    const htc = result.markers.find((m) => m.markerName === 'Hematócrito')
    expect(htc?.numericValue).toBe(32.3)
    expect(htc?.status).toBe('altered') // 32,3 < ref 33,0

    const leuc = result.markers.find((m) => m.markerName === 'Leucócitos')
    expect(leuc?.numericValue).toBe(9000) // milhar "9.000"

    const plaqt = result.markers.find((m) => m.markerName === 'Plaquetas')
    expect(plaqt?.numericValue).toBe(610000)
    expect(plaqt?.status).toBe('normal')

    // Hemácias, MCV, RDW, Segmentados, Linfócitos, Monócitos presentes
    expect(result.markers.length).toBeGreaterThanOrEqual(10)
  })

  it('extrai triagem neonatal compilada SEM contaminação (bug v1 corrigido)', () => {
    const parser = new MaterDeiPdfReportParser()
    const result = parser.parse(NEONATAL_COMPILED)

    // Fenilalanina REAL é 0,7 (v1 pegava 5,2 da IRT)
    const fenil = result.markers.find((m) => m.markerName === 'Fenilalanina')
    expect(fenil?.numericValue).toBe(0.7)
    expect(fenil?.unit).toBe('mg/dL')

    // TSH Neonatal = 2.08 → 2.08 (milhar BR) = 208? NÃO — TSH usa ponto decimal: 2,08
    // "2.08" com ponto não é milhar (só 2 dígitos depois), parseNumeric mantém 2.08
    const tsh = result.markers.find((m) => m.markerName === 'TSH Neonatal')
    expect(tsh?.displayValue.replace(/\s/g, '')).toMatch(/2\.08|2,08/)
    expect(tsh?.numericValue).toBeCloseTo(2.08, 2)

    // IRT = 5,2 ng/mL
    const irt = result.markers.find((m) => m.markerName === 'Tripsina Imuno Reativa (IRT)')
    expect(irt?.numericValue).toBe(5.2)
    expect(irt?.unit).toContain('ng/mL')

    // 17-OHP = 3.01 → 3,01
    const ohp = result.markers.find((m) => m.markerName === '17-OH-Progesterona')
    expect(ohp?.numericValue).toBeCloseTo(3.01, 2)

    // Biotinidase qualitativa NORMAL
    const biot = result.markers.find((m) => m.markerName === 'Biotinidase (Atividade)')
    expect(biot?.displayValue).toBe('NORMAL')
    expect(biot?.numericValue).toBeUndefined()

    // Galactose = 2,1
    const gal = result.markers.find((m) => m.markerName === 'Galactose Total')
    expect(gal?.numericValue).toBe(2.1)

    // G6PD = 7,0 U/g — e NÃO deve aparecer como "Glicose de Jejum" (bug v1)
    const g6pd = result.markers.find((m) => m.markerName.includes('G6PD'))
    expect(g6pd?.numericValue).toBe(7)
    expect(g6pd?.unit).toContain('U/g')
    const glicoseJejum = result.markers.find((m) => m.markerName === 'Glicose de Jejum')
    expect(glicoseJejum).toBeUndefined()
  })

  it('metadados globais (paciente, médico, pedido, coleta)', () => {
    const parser = new MaterDeiPdfReportParser()
    const result = parser.parse(VIRAL_PANEL)
    expect(result.patientName).toBe('BRUNO DRUMMOND FREITAS REIS')
    expect(result.orderNumber).toContain('18172437*9873406')
    expect(result.collectedAt?.getFullYear()).toBe(2026)
    expect(result.collectedAt?.getMonth()).toBe(6) // julho
  })
})
