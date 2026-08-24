import { MaterDeiPdfReportParser, splitIntoSections } from '../src/infrastructure/ocr/materdei-pdf.parser.js'

const sample = `ATIVIDADE ENZIMÁTICA DA BIOTINIDASE

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
1/1`

const sections = splitIntoSections(sample)
console.log('Seções:', JSON.stringify(sections.map((s) => ({ title: s.title, body: s.body.slice(0, 120) })), null, 2))

const parser = new MaterDeiPdfReportParser()
const result = parser.parse(sample)
console.log('Markers:', JSON.stringify(result.markers, null, 2))