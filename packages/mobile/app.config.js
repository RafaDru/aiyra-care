import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import appJson from './app.json'

const dir = dirname(fileURLToPath(import.meta.url))
const envPath = join(dir, '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    const key = t.slice(0, i).trim()
    const val = t.slice(i + 1).trim()
    if (key.startsWith('EXPO_PUBLIC_') && !process.env[key]) {
      process.env[key] = val
    }
  }
}

const expo = appJson.expo ?? appJson

export default () => ({
  ...expo,
})
