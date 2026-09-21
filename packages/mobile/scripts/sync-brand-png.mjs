/**
 * Gera PNG @3x a partir dos SVG canônicos do web (paridade visual no React Native).
 * Uso: node packages/mobile/scripts/sync-brand-png.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const webBrand = join(root, '..', 'web', 'public', 'brand')
const outDir = join(root, 'assets', 'brand')
mkdirSync(outDir, { recursive: true })

const PAIRS = [
  ['logo-horizontal.svg', 'logo-horizontal.png'],
  ['logo-horizontal-dark.svg', 'logo-horizontal-dark.png'],
  ['logo-square.svg', 'logo-square.png'],
  ['logo-square-dark.svg', 'logo-square-dark.png'],
]

const SCALE = 3

for (const [svgName, pngName] of PAIRS) {
  const svgPath = join(webBrand, svgName)
  const svg = readFileSync(svgPath)
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'zoom', value: SCALE },
  })
  const png = resvg.render().asPng()
  writeFileSync(join(outDir, pngName), png)
  console.log(`wrote ${pngName} (${png.length} bytes)`)
}
