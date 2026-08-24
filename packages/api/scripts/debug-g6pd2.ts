// Testa splitValueUnit indiretamente via parser
import { MaterDeiPdfReportParser } from '../src/infrastructure/ocr/materdei-pdf.parser.js'

const sample = `GLICOSE 6- FOSFATO DEHIDROGENASE

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

const parser = new MaterDeiPdfReportParser()
const result = parser.parse(sample)
console.log('Markers:', JSON.stringify(result.markers, null, 2))