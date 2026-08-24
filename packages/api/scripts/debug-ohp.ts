import { splitIntoSections } from '../src/infrastructure/ocr/materdei-pdf.parser.js'

const sample = `17 ALPHA-OH-PROGESTERONA NEONATAL

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
1/1`

const sections = splitIntoSections(sample)
console.log('Seções:', JSON.stringify(sections.map((s) => ({ title: s.title, body: s.body })), null, 2))