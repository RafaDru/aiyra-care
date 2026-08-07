import { request } from 'playwright'

const text = await (await request.newContext().then((r) => r.get('https://meu.materdei.com.br/main.dart.js'))).text()

// Find dsA function - visualizar exame handler
const marker = 'A.dsA=function'
const idx = text.indexOf(marker)
console.log('dsA:', text.slice(idx, idx + 2500))

// Search all /domain endpoints
let pos = 0
let count = 0
while (count < 15) {
  pos = text.indexOf('/domain', pos + 1)
  if (pos < 0) break
  const ctx = text.slice(pos - 100, pos + 80)
  if (/exam|image|pacs|surgical|proxy/i.test(ctx)) {
    console.log('\n/domain:', ctx.replace(/\s+/g, ' '))
    count++
  }
}
