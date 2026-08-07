import fs from 'fs'

const runtime = fs.readFileSync('C:/Users/rafae/Documents/Filhos/tmp-runtime.js', 'utf8')
// webpack chunk mapping: e.u = chunkId => import chunk
const match = runtime.match(/\{(\d+:"[^"]+",?)+/)
if (match) {
  const chunkMap = [...runtime.matchAll(/(\d+):"([a-f0-9]+)"/g)]
  for (const [, id, hash] of chunkMap) {
    if (['7653', '2076', '2069', '1129', '7195'].includes(id)) {
      console.log(id, hash)
    }
  }
}

// try common pattern
for (const id of ['7653', '2076', '2069', '1129']) {
  const urls = [
    `https://cadernetadacrianca.saude.gov.br/${id}.js`,
    `https://cadernetadacrianca.saude.gov.br/${id}.${id}.js`,
  ]
  for (const url of urls) {
    const res = await fetch(url, { method: 'HEAD' })
    console.log(url, res.status)
  }
}
