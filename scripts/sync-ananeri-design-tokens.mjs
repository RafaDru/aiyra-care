/**
 * Gera packages/design-tokens/src/index.ts a partir do JSON oficial do kit.
 * Uso: node scripts/sync-ananeri-design-tokens.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const jsonPath = join(
  root,
  'packages/web/public/brand/kit-oficial-ananeri/07-guia-e-tokens-chatgpt/ananeri-design-tokens.json',
)
const outPath = join(root, 'packages/design-tokens/src/index.ts')

const kit = JSON.parse(readFileSync(jsonPath, 'utf8'))
const { anaPink, neriPurple, sparkGold, surfacesLightMode, surfacesDarkMode } = kit.colors

const source = `/** Shared Ananeri design tokens — synced from kit ananeri-design-tokens.json */
export const AIYRACARE_TOKENS = {
  colorPrimary: '${neriPurple.lightStart}',
  colorPrimaryHover: '${neriPurple.vividAccent}',
  colorPrimaryActive: '${neriPurple.midCore}',
  colorInfo: '${anaPink.midCore}',
  colorLink: '${anaPink.midCore}',
  colorWarning: '${sparkGold.lightStart}',
  colorSuccess: '#10B981',
  colorError: '#EF4444',
  borderRadius: 12,
  fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  padding: 16,
  paddingLG: 24,
  paddingXL: 32,
  colorBgLayout: '${surfacesLightMode.pageCanvas}',
  colorBgContainer: '#FFFFFF',
  colorTextBase: '${surfacesLightMode.textBody}',
  colorTextSecondary: '${surfacesLightMode.textMuted}',
  colorBorder: '${anaPink.softBorder}',
  brandGold: '${sparkGold.midCore}',
  colorPrimaryBg: '${neriPurple.softBg}',
  colorPrimaryBorder: '${neriPurple.softBorder}',
} as const

export const AIYRACARE_DARK = {
  colorPrimary: '${neriPurple.vividAccent}',
  colorPrimaryHover: '#A855F7',
  colorPrimaryActive: '${neriPurple.lightStart}',
  colorInfo: '${anaPink.lightStart}',
  colorLink: '${anaPink.midCore}',
  colorBgLayout: '${surfacesDarkMode.pageCanvas}',
  colorBgContainer: '${surfacesDarkMode.surfaceCard}',
  colorTextBase: '#f1f5f9',
  colorTextSecondary: '#94a3b8',
  colorBorder: '#334155',
} as const

export type AiyraThemeTokens = typeof AIYRACARE_TOKENS
`

writeFileSync(outPath, source)
console.log(`wrote ${outPath}`)