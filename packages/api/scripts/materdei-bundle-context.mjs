import { readFileSync, writeFileSync } from 'fs'
import { request } from 'playwright'

const req = await request.newContext()
const res = await req.get('https://meu.materdei.com.br/main.dart.js')
const text = await res.text()
await req.dispose()

const needles = [
  'result-exam/api/v1/patients/exams/download',
  'partially-available/download',
  'exams/search',
]
for (const n of needles) {
  const i = text.indexOf(n)
  console.log('\n===', n, '===')
  console.log(text.slice(Math.max(0, i - 200), i + 400))
}
