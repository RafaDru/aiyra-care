/**
 * Túnel HTTP público para a API local (:3010) — uso com Expo Go em 4G.
 * Escreve a URL em packages/mobile/.api-tunnel-url e mantém o processo vivo.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import localtunnel from 'localtunnel'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const urlFile = path.join(root, 'packages/mobile/.api-tunnel-url')
const port = Number(process.env.API_TUNNEL_PORT || '3010')

async function main() {
  const tunnel = await localtunnel({ port })
  const url = tunnel.url.replace(/\/$/, '')
  fs.writeFileSync(urlFile, url, 'utf8')
  console.log(`[mobile-api-tunnel] API pública: ${url}`)
  console.log(`[mobile-api-tunnel] Arquivo: ${urlFile}`)

  tunnel.on('close', () => {
    try {
      fs.unlinkSync(urlFile)
    } catch {
      // ignore
    }
  })

  const shutdown = () => {
    tunnel.close()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error('[mobile-api-tunnel] falhou:', err)
  process.exit(1)
})
