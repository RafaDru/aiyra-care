/**
 * Rasteriza ícones PWA a partir do kit oficial (app-icon royal + favicon).
 * Uso: node packages/web/scripts/rasterize-brand-pwa-icons.mjs
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const brandDir = join(root, 'public', 'brand')
const kitIcons = join(brandDir, 'kit-oficial-ananeri/04-app-icons-e-favicons')
mkdirSync(brandDir, { recursive: true })

const workspaceRoot = join(root, '..', '..')
const interSemi = join(
  workspaceRoot,
  'node_modules',
  '@expo-google-fonts',
  'inter',
  '600SemiBold',
  'Inter_600SemiBold.ttf',
)

const fontOpts = existsSync(interSemi)
  ? {
      font: {
        fontFiles: [interSemi],
        loadSystemFonts: true,
        defaultFontFamily: 'Inter',
      },
    }
  : {}

function rasterize(svgRel, outName, px) {
  const svgPath = join(kitIcons, svgRel)
  const svg = readFileSync(svgPath)
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: px },
    ...fontOpts,
  })
  const png = resvg.render().asPng()
  writeFileSync(join(brandDir, outName), png)
  console.log(`wrote ${outName} (${px}px, ${png.length} bytes)`)
}

rasterize('app-icon-ios-android-royal.svg', 'pwa-icon-192.png', 192)
rasterize('app-icon-ios-android-royal.svg', 'pwa-icon-512.png', 512)
rasterize('app-icon-ios-android-royal.svg', 'pwa-icon-512-maskable.png', 512)
rasterize('favicon.svg', 'favicon-32.png', 32)
rasterize('app-icon-ios-android-royal.svg', 'apple-touch-icon.png', 180)