/**
 * Gera PNG @3x a partir dos SVG canônicos do web (paridade visual no React Native).
 * Requer Inter (600) — mesmo do wordmark no SVG — via @expo-google-fonts/inter.
 * Uso: node packages/mobile/scripts/sync-brand-png.mjs
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const workspaceRoot = join(root, '..', '..')
const webBrand = join(root, '..', 'web', 'public', 'brand')
const outDir = join(root, 'assets', 'brand')
mkdirSync(outDir, { recursive: true })

const INTER_SEMIBOLD = join(
  workspaceRoot,
  'node_modules',
  '@expo-google-fonts',
  'inter',
  '600SemiBold',
  'Inter_600SemiBold.ttf',
)

if (!existsSync(INTER_SEMIBOLD)) {
  console.error(
    'Inter TTF não encontrado. Rode: npm install @expo-google-fonts/inter (raiz ou workspace mobile).',
  )
  process.exit(1)
}

const kit = join(webBrand, 'kit-oficial-ananeri')
const lockups = join(kit, '01-lockups-principais')
const symbolDir = join(kit, '02-simbolo-e-wordmark')

const PAIRS = [
  [join(lockups, 'ananeri-lockup-horizontal-light.svg'), 'logo-horizontal.png'],
  [join(lockups, 'ananeri-lockup-horizontal-dark.svg'), 'logo-horizontal-dark.png'],
  [join(symbolDir, 'ananeri-symbol-heart.svg'), 'logo-square.png'],
  [join(symbolDir, 'ananeri-symbol-heart.svg'), 'logo-square-dark.png'],
]

/** PNG estático do web — copiado sem raster (já otimizado). */
const PNG_COPY = ['ava-avatar.png']

const SCALE = 3

for (const [svgPath, pngName] of PAIRS) {
  const svg = readFileSync(svgPath)
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'zoom', value: SCALE },
    font: {
      fontFiles: [INTER_SEMIBOLD],
      loadSystemFonts: true,
      defaultFontFamily: 'Inter',
    },
  })
  const png = resvg.render().asPng()
  writeFileSync(join(outDir, pngName), png)
  console.log(`wrote ${pngName} (${png.length} bytes)`)
}

for (const pngName of PNG_COPY) {
  const src = join(webBrand, pngName)
  if (!existsSync(src)) {
    console.warn(`skip copy ${pngName} — missing in web brand`)
    continue
  }
  copyFileSync(src, join(outDir, pngName))
  console.log(`copied ${pngName}`)
}
