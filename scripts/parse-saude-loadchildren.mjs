import fs from 'fs'

const t = fs.readFileSync('C:/Users/rafae/Documents/Filhos/tmp-caderneta-main.js', 'utf8')
const re = /path:"saude-da-crianca"[^}]{0,500}/g
let m
while ((m = re.exec(t)) !== null) {
  console.log(m[0])
}
