import fs from 'fs'

const t = fs.readFileSync('C:/Users/rafae/Documents/Filhos/tmp-caderneta-main.js', 'utf8')
const idx = t.indexOf('saude-da-crianca')
console.log(t.slice(idx, idx + 1500))
