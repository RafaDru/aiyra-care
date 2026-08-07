import { request } from 'playwright'

const req = await request.newContext()
const res = await req.get('https://meu.materdei.com.br/main.dart.js')
const text = await res.text()
await req.dispose()

for (const n of ['exams/download', 'partially-available', 'exams/api/v1']) {
  let idx = 0
  let count = 0
  while (count < 5) {
    idx = text.indexOf(n, idx + 1)
    if (idx < 0) break
    console.log('\n---', n, count, '---')
    console.log(text.slice(idx - 150, idx + 250))
    count++
  }
}
