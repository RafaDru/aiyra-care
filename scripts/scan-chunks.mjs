import fs from 'fs'

function scanFile(path) {
  const t = fs.readFileSync(path, 'utf8')
  const http = [...t.matchAll(/http\.(get|post)\([^)]{0,500}\)/g)].map((m) => m[0])
  const fhir = [...t.matchAll(/fhir\/r4\/[^"'`]+/g)].map((m) => m[0])
  const urls = [...new Set([...t.matchAll(/https?:\/\/[^\s"'`]+/g)].map((m) => m[0]))]
  console.log(path, 'size', t.length)
  console.log('http:', http.join('\n'))
  console.log('fhir paths:', [...new Set(fhir)].join('\n'))
  console.log('urls:', urls.filter((u) => u.includes('saude') || u.includes('gov')).join('\n'))
  const chunkRefs = [...t.matchAll(/D\.e\((\d+)\)/g)].map((m) => m[1])
  console.log('chunk refs:', [...new Set(chunkRefs)].join(','))
}

scanFile('C:/Users/rafae/Documents/Filhos/tmp-chunk-7653.js')
console.log('---')
scanFile('C:/Users/rafae/Documents/Filhos/tmp-chunk-2076.js')
