const { readFileSync, existsSync } = require('node:fs')
const { join } = require('node:path')

const dir = __dirname
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

const appJson = JSON.parse(readFileSync(join(dir, 'app.json'), 'utf8'))

module.exports = () => ({
  ...appJson.expo,
})
