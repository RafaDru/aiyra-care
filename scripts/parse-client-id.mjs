import fs from 'fs'

const t = fs.readFileSync('C:/Users/rafae/Documents/Filhos/tmp-caderneta-main.js', 'utf8')
const idx = t.indexOf('CLIENT_ID')
console.log(t.slice(idx, idx + 800).replace(/\s+/g, ' '))

// find module 5312 config
const idx2 = t.indexOf('5312:(Oe,oe,D)')
console.log('5312:', t.slice(idx2, idx2 + 1200).replace(/\s+/g, ' ').slice(0, 800))
