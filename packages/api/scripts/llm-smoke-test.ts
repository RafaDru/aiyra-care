/**
 * Smoke test LLM providers + cascata Ava (requer chaves no ambiente).
 * Usage: npx tsx packages/api/scripts/llm-smoke-test.ts [--with-sharing]
 */
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { LlmMessage } from '../src/domain/llm/llm.types.js'
import {
  isAvaLlmEnabled,
  opencodeGoApiKey,
  opencodeZenApiKey,
} from '../src/domain/llm/llm-policy.js'
import { completeWithGemini, completeWithGroq } from '../src/infrastructure/llm/llm-chat.providers.js'
import {
  completeWithOpenCodeGo,
  completeWithOpenCodeZenFree,
} from '../src/infrastructure/llm/opencode-chat.provider.js'
import { LlmRouter } from '../src/infrastructure/llm/llm-router.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
config({ path: resolve(root, '.env') })

function importMachineEnvIfMissing(canonical: string, aliases: string[]): void {
  if (process.env[canonical]?.trim()) return
  for (const alias of aliases) {
    const v = process.env[alias]?.trim()
    if (v) {
      process.env[canonical] = v
      return
    }
  }
}

importMachineEnvIfMissing('OPENCODE_GO_API_KEY', ['OPENCODEGO_API_KEY', 'OPENCODE_GO_API_KEY'])
importMachineEnvIfMissing('OPENCODE_ZEN_API_KEY', ['OPENCODE_ZEN_API_KEY', 'OPENCODEGO_API_KEY'])
importMachineEnvIfMissing('GEMINI_API_KEY', ['GEMINI_API_KEY'])
importMachineEnvIfMissing('GROQ_API_KEY', ['GROQ_API_KEY'])

const PROMPT = 'Responda apenas com a palavra ok, sem pontuação.'
const messages: LlmMessage[] = [{ role: 'user', content: PROMPT }]
const withSharing = process.argv.includes('--with-sharing')

type Row = {
  name: string
  ok: boolean
  provider?: string
  preview?: string
  ms?: number
  error?: string
}

async function probe(name: string, fn: () => Promise<{ provider: string; text: string }>): Promise<Row> {
  const start = Date.now()
  try {
    const r = await fn()
    return {
      name,
      ok: true,
      provider: r.provider,
      preview: r.text.replace(/\s+/g, ' ').slice(0, 48),
      ms: Date.now() - start,
    }
  } catch (err) {
    return {
      name,
      ok: false,
      ms: Date.now() - start,
      error: err instanceof Error ? err.message.slice(0, 220) : String(err),
    }
  }
}

function printTable(rows: Row[]): void {
  console.log('')
  console.log('| Provider / teste          | OK  | ms   | detalhe')
  console.log('|---------------------------|-----|------|--------')
  for (const r of rows) {
    const detail = r.ok
      ? `${r.provider ?? ''} — ${r.preview ?? ''}`
      : r.error ?? 'falhou'
    console.log(
      `| ${r.name.padEnd(25)} | ${r.ok ? 'yes' : 'NO '} | ${String(r.ms ?? '').padStart(4)} | ${detail}`,
    )
  }
  console.log('')
}

console.log('LLM smoke — chaves detectadas:')
console.log('  OPENCODE_GO/ZEN:', Boolean(opencodeGoApiKey()), Boolean(opencodeZenApiKey()))
console.log('  GEMINI:', Boolean(process.env.GEMINI_API_KEY?.trim()))
console.log('  GROQ:', Boolean(process.env.GROQ_API_KEY?.trim()))
console.log('  Ava enabled:', isAvaLlmEnabled())
console.log('  Consent sharing:', withSharing)

const rows: Row[] = []

const SMOKE_SESSION = 'llm-smoke-test'

if (withSharing && opencodeZenApiKey()) {
  rows.push(await probe('zen-free', () => completeWithOpenCodeZenFree(messages, 'free', { sessionId: SMOKE_SESSION })))
} else if (withSharing) {
  rows.push({ name: 'zen-free', ok: false, error: 'sem OPENCODE_ZEN/GO key' })
}

if (opencodeGoApiKey()) {
  rows.push(await probe('opencode-go', () => completeWithOpenCodeGo(messages, 'free', { sessionId: SMOKE_SESSION })))
}

if (process.env.GEMINI_API_KEY?.trim()) {
  rows.push(await probe('gemini-flash', () =>
    completeWithGemini(messages, 'free', { model: 'gemini-2.5-flash' })))
}

if (process.env.GROQ_API_KEY?.trim()) {
  rows.push(await probe('groq', () => completeWithGroq(messages, 'free')))
}

const router = new LlmRouter()
rows.push(await probe('cascade (default)', () =>
  router.completeChat(messages, 'free', { allowLlmDataSharing: false })))

if (withSharing) {
  rows.push(await probe('cascade (+sharing)', () =>
    router.completeChat(messages, 'free', { allowLlmDataSharing: true })))
}

printTable(rows)

const anyOk = rows.some((r) => r.ok)
const cascadeOk = rows.some((r) => r.name.startsWith('cascade') && r.ok)

if (!anyOk) {
  console.error('FAIL: nenhum provedor respondeu.')
  process.exit(1)
}

if (!cascadeOk) {
  console.error('FAIL: cascata Ava não completou (crítico).')
  process.exit(1)
}

console.log('OK: pelo menos um provedor e a cascata Ava funcionaram.')
