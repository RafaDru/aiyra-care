import { request } from 'playwright'

const req = await request.newContext()
for (const path of ['/main.dart.js', '/flutter.js', '/index.html']) {
  const res = await req.get(`https://meu.materdei.com.br${path}`)
  if (!res.ok()) continue
  const text = await res.text()
  const hits = new Set()
  for (const m of text.matchAll(/result-exam[a-zA-Z0-9_\-\/]*/g)) hits.add(m[0])
  for (const m of text.matchAll(/documents[a-zA-Z0-9_\-\/]*download[a-zA-Z0-9_\-\/]*/g)) hits.add(m[0])
  for (const m of text.matchAll(/reportAvailable[a-zA-Z0-9_\-\/]*/g)) hits.add(m[0])
  console.log('\n', path, 'hits', [...hits].slice(0, 40))
}
await req.dispose()
