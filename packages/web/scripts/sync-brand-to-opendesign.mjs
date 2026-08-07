import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '../../..')
const brandDir = join(root, 'packages/web/public/brand')
const odRoot = join(
  process.env.APPDATA || '',
  'Open Design/namespaces/release-stable-win/data/design-systems/open-health-platform-for-users-and-patients',
)

const PALETTE_LIGHT = {
  primary: '#9333EA',
  primaryHover: '#A855F7',
  primaryActive: '#7E22CE',
  primaryBg: '#F3E8FF',
  primaryBorder: '#E9D5FF',
  accent: '#FF3DA8',
  accentHover: '#FF5BC4',
  accentBg: '#FCE7F3',
  insight: '#FFE566',
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1E293B',
  textSecondary: '#64748B',
  border: '#E2E8F0',
}

const PALETTE_DARK = {
  primary: '#A855F7',
  primaryHover: '#C084FC',
  primaryActive: '#9333EA',
  primaryBg: '#2E1065',
  primaryBorder: '#581C87',
  accent: '#FF5BC4',
  accentHover: '#FF7AD4',
  accentBg: '#500724',
  insight: '#FFE566',
  bg: '#0f0f0f',
  surface: '#1a1a1a',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  border: '#334155',
}

function syncOpenDesign() {
  if (!existsSync(odRoot)) {
    console.warn('Open Design path not found:', odRoot)
    return false
  }

  const systemDir = join(odRoot, 'system')
  const assetsDir = join(odRoot, 'assets')
  mkdirSync(assetsDir, { recursive: true })

  const palettes = { palettes: { aiyra: PALETTE_LIGHT } }
  writeFileSync(join(systemDir, 'tokens.palettes.json'), JSON.stringify(palettes, null, 2) + '\n')

  const tokensDefault = {
    algorithm: 'default',
    colorPrimary: PALETTE_LIGHT.primary,
    colorPrimaryBg: PALETTE_LIGHT.primaryBg,
    colorPrimaryBorder: PALETTE_LIGHT.primaryBorder,
    colorPrimaryHover: PALETTE_LIGHT.primaryHover,
    colorPrimaryActive: PALETTE_LIGHT.primaryActive,
    colorInfo: PALETTE_LIGHT.accent,
    colorLink: PALETTE_LIGHT.accent,
    colorWarning: PALETTE_LIGHT.insight,
    colorSuccess: '#10B981',
    colorError: '#EF4444',
    colorBgLayout: PALETTE_LIGHT.bg,
    colorBgContainer: PALETTE_LIGHT.surface,
    colorText: PALETTE_LIGHT.text,
    colorTextSecondary: PALETTE_LIGHT.textSecondary,
    colorBorder: PALETTE_LIGHT.border,
    borderRadius: 12,
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
  }
  writeFileSync(join(systemDir, 'tokens.default.json'), JSON.stringify(tokensDefault, null, 2) + '\n')

  const tokensDark = {
    algorithm: 'dark',
    colorPrimary: PALETTE_DARK.primary,
    colorPrimaryBg: PALETTE_DARK.primaryBg,
    colorPrimaryBorder: PALETTE_DARK.primaryBorder,
    colorPrimaryHover: PALETTE_DARK.primaryHover,
    colorPrimaryActive: PALETTE_DARK.primaryActive,
    colorInfo: PALETTE_DARK.accent,
    colorLink: PALETTE_DARK.accent,
    colorWarning: PALETTE_DARK.insight,
    colorSuccess: '#34D399',
    colorError: '#F87171',
    colorBgLayout: PALETTE_DARK.bg,
    colorBgContainer: PALETTE_DARK.surface,
    colorText: PALETTE_DARK.text,
    colorTextSecondary: PALETTE_DARK.textSecondary,
    colorBorder: PALETTE_DARK.border,
    borderRadius: 12,
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
  }
  writeFileSync(join(systemDir, 'tokens.dark.json'), JSON.stringify(tokensDark, null, 2) + '\n')

  const variablesCss = `:root {
  --brand-color-primary: ${PALETTE_LIGHT.primary};
  --brand-color-primary-hover: ${PALETTE_LIGHT.primaryHover};
  --brand-color-primary-active: ${PALETTE_LIGHT.primaryActive};
  --brand-color-accent: ${PALETTE_LIGHT.accent};
  --brand-color-insight: ${PALETTE_LIGHT.insight};
  --brand-bg: ${PALETTE_LIGHT.bg};
  --brand-surface: ${PALETTE_LIGHT.surface};
  --brand-text: ${PALETTE_LIGHT.text};
  --brand-text-secondary: ${PALETTE_LIGHT.textSecondary};
  --brand-border: ${PALETTE_LIGHT.border};
  --brand-radius: 12px;
}\n`
  writeFileSync(join(systemDir, 'variables.css'), variablesCss)

  const variablesDarkCss = `:root[data-theme="dark"] {
  --brand-color-primary: ${PALETTE_DARK.primary};
  --brand-color-primary-hover: ${PALETTE_DARK.primaryHover};
  --brand-color-primary-active: ${PALETTE_DARK.primaryActive};
  --brand-color-accent: ${PALETTE_DARK.accent};
  --brand-color-insight: ${PALETTE_DARK.insight};
  --brand-bg: ${PALETTE_DARK.bg};
  --brand-surface: ${PALETTE_DARK.surface};
  --brand-text: ${PALETTE_DARK.text};
  --brand-text-secondary: ${PALETTE_DARK.textSecondary};
  --brand-border: ${PALETTE_DARK.border};
}\n`
  writeFileSync(join(systemDir, 'variables.dark.css'), variablesDarkCss)

  let brand = {}
  const brandPath = join(odRoot, 'brand.json')
  if (existsSync(brandPath)) {
    brand = JSON.parse(readFileSync(brandPath, 'utf8'))
  }
  brand.name = 'Aiyra Care'
  brand.tagline = 'Open Health Platform'
  brand.description =
    'Plataforma de saúde pediátrica e familiar. Paleta viva: roxo #9333EA, rosa #FF3DA8, rede amarela #FFE566.'
  brand.palettes = { aiyra: PALETTE_LIGHT }
  brand.darkPalette = PALETTE_DARK
  brand.colors = [
    { role: 'background', hex: '#f8fafc', name: 'Background', usage: 'page canvas' },
    { role: 'foreground', hex: '#1e293b', name: 'Foreground', usage: 'body text' },
    { role: 'accent', hex: '#9333ea', name: 'Primary purple', usage: 'primary actions, Care wordmark' },
    { role: 'secondary', hex: '#ff3da8', name: 'Accent pink', usage: 'links, Aiyra wordmark' },
    { role: 'insight', hex: '#ffe566', name: 'Network / IA', usage: 'AI insights and logo heart network' },
    { role: 'surface', hex: '#ffffff', name: 'Surface', usage: 'cards' },
    { role: 'muted', hex: '#64748b', name: 'Muted', usage: 'tagline and secondary text' },
    { role: 'border', hex: '#e2e8f0', name: 'Border', usage: 'dividers' },
  ]
  if (brand.logo?.brief) {
    brand.logo.brief.symbolColor = '#FFE566'
    brand.logo.brief.wordmarkColor = '#9333EA'
    brand.logo.brief.taglineColor = '#64748B'
  }
  writeFileSync(brandPath, JSON.stringify(brand, null, 2) + '\n')

  const logoFiles = [
    ['logo-horizontal.svg', 'logo-proposal-horizontal.svg'],
    ['logo-square.svg', 'logo-proposal-stacked.svg'],
    ['logo-icon.svg', 'logo-proposal-icon.svg'],
    ['logo-horizontal-dark.svg', 'logo-proposal-horizontal-dark.svg'],
    ['logo-square-dark.svg', 'logo-proposal-stacked-dark.svg'],
    ['logo-icon-dark.svg', 'logo-proposal-icon-dark.svg'],
  ]
  for (const [src, dest] of logoFiles) {
    const from = join(brandDir, src)
    if (existsSync(from)) copyFileSync(from, join(assetsDir, dest))
  }

  console.log('Open Design synced: palette aiyra + logos')
  return true
}

syncOpenDesign()
