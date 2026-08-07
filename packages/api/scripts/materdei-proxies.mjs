import { request } from 'playwright'

const text = await (await request.newContext().then((r) => r.get('https://meu.materdei.com.br/main.dart.js'))).text()

const proxies = new Set()
for (const m of text.matchAll(/proxy\/[a-zA-Z0-9_-]+/g)) proxies.add(m[0])
console.log([...proxies].sort().join('\n'))

// search examImage service config
for (const term of ['examImage', 'exam-image', 'image-exam', 'pacs', 'viewer']) {
  const i = text.indexOf(term)
  if (i >= 0) console.log('\n', term, 'at', i)
}

// Find $.by = function or by=function
const byIdx = text.indexOf('$.by=')
console.log('\n$.by=', text.slice(byIdx, byIdx + 400))
