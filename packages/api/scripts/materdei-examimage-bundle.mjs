import { request } from 'playwright'

const text = await (await request.newContext().then((r) => r.get('https://meu.materdei.com.br/main.dart.js'))).text()

const idx = text.indexOf('visualizarExameDeImagem')
console.log('visualizar ctx:', text.slice(idx, idx + 1200))

const idx2 = text.indexOf('"examImage"')
console.log('\nexamImage ctx:', text.slice(idx2 - 100, idx2 + 500))

// Search proxy paths containing image
for (const m of text.matchAll(/proxy\/[a-z-]+\/[a-z0-9-]+\/api[^"\\]{0,120}/gi)) {
  const s = m[0]
  if (/image|pacs|dicom|viewer|domain/i.test(s)) console.log('proxy:', s)
}

// accession in bundle near exam
let aidx = 0
let n = 0
while (n < 5) {
  aidx = text.indexOf('accession_number', aidx + 1)
  if (aidx < 0) break
  console.log('\naccession ctx:', text.slice(aidx - 120, aidx + 200))
  n++
}
