import fs from 'fs'

const runtime = fs.readFileSync('C:/Users/rafae/Documents/Filhos/tmp-runtime.js', 'utf8')
for (const id of ['148', '257', '441', '506', '588', '964', '1049']) {
  const m = runtime.match(new RegExp(`${id}:"([a-f0-9]+)"`))
  console.log(id, m?.[1])
}
