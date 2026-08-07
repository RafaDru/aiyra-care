import fs from 'fs'

const runtime = fs.readFileSync('C:/Users/rafae/Documents/Filhos/tmp-runtime.js', 'utf8')
const chunks = [...runtime.matchAll(/(\d+):"([a-f0-9]+)"/g)]
const hits = []

for (const [, id, hash] of chunks) {
  const url = `https://cadernetadacrianca.saude.gov.br/${id}.${hash}.js`
  try {
    const res = await fetch(url)
    if (!res.ok) continue
    const t = await res.text()
    if (t.includes('fhir') || t.includes('vacin') || t.includes('depend') || t.includes('immun')) {
      hits.push({ id, hash, len: t.length })
      fs.writeFileSync(`C:/Users/rafae/Documents/Filhos/tmp-chunk-${id}.js`, t)
    }
  } catch {
    // skip
  }
}

console.log('hits:', hits)

for (const h of hits) {
  const t = fs.readFileSync(`C:/Users/rafae/Documents/Filhos/tmp-chunk-${h.id}.js`, 'utf8')
  const fhir = [...new Set([...t.matchAll(/fhir\/r4\/[^"'`]+/g)].map((m) => m[0]))]
  const http = [...t.matchAll(/http\.(get|post)\([^)]{0,300}\)/g)].map((m) => m[0].replace(/\s+/g, ' '))
  console.log('\nchunk', h.id, 'fhir:', fhir.join(' | '))
  console.log('http:', http.slice(0, 10).join('\n'))
}
