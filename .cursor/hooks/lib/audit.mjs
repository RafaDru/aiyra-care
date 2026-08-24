import { appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('../../..', import.meta.url)))

function dayStamp() {
  return new Date().toISOString().slice(0, 10)
}

export function auditWrite(kind, payload) {
  const file = join(ROOT, 'docs/dev-audit', kind, `${dayStamp()}.jsonl`)
  mkdirSync(dirname(file), { recursive: true })
  const line = JSON.stringify({ ts: new Date().toISOString(), ...payload })
  appendFileSync(file, `${line}\n`, 'utf8')
}

export function readStdinJson() {
  const raw = readStdin()
  if (!raw.trim()) return {}
  return JSON.parse(raw)
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8')
  } catch {
    return ''
  }
}
