import fs from 'fs'

const runtime = fs.readFileSync('C:/Users/rafae/Documents/Filhos/tmp-runtime.js', 'utf8')
const chunkIds = [...runtime.matchAll(/(\d+):\s*"[^"]+"/g)].map((m) => m[1])
console.log('chunk ids sample:', chunkIds.slice(0, 40).join(', '))

// Download minha-familia chunk 7653
const url = 'https://cadernetadacrianca.saude.gov.br/7653.js'
const res = await fetch(url)
if (!res.ok) {
  console.log('7653 failed', res.status)
} else {
  const t = await res.text()
  fs.writeFileSync('C:/Users/rafae/Documents/Filhos/tmp-chunk-7653.js', t)
  const urls = [...new Set([...t.matchAll(/https?:\/\/[^\s"'`]+/g)].map((m) => m[0]).filter((u) => u.includes('saude') || u.includes('gov')))]
  console.log('urls in 7653:', urls.join('\n'))
  const paths = [...new Set([...t.matchAll(/['"`](\/[a-zA-Z0-9_/-]{3,80})['"`]/g)].map((m) => m[1]).filter((p) => !p.includes('node_modules')))]
  console.log('paths:', paths.filter((p) => p.includes('api') || p.includes('vacin') || p.includes('depend') || p.includes('famil')).join('\n'))
}
