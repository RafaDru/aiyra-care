import { splitIntoSections } from '../src/infrastructure/ocr/materdei-pdf.parser.js'

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

const sections = splitIntoSections(sample)
console.log('Seções:', JSON.stringify(sections.map((s) => ({ title: s.title, body: s.body })), null, 2))