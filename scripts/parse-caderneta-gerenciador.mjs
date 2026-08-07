import fs from 'fs'

const t = fs.readFileSync('C:/Users/rafae/Documents/Filhos/tmp-caderneta-main.js', 'utf8')
let i = 0
let count = 0
while ((i = t.indexOf('URL_GERENCIADOR', i + 1)) >= 0 && count < 30) {
  const snippet = t.slice(i, i + 500)
  if (snippet.includes('get(') || snippet.includes('post(') || snippet.includes('/api')) {
    console.log(snippet.replace(/\s+/g, ' ').slice(0, 450))
    console.log('---')
    count++
  }
}

// Search EHR_SERVICE usages
i = 0
count = 0
while ((i = t.indexOf('EHR_SERVICE', i + 1)) >= 0 && count < 25) {
  console.log(t.slice(i, i + 280).replace(/\s+/g, ' '))
  console.log('---')
  count++
}
