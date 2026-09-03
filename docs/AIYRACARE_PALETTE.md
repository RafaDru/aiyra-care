# Paleta Aiyra Care — Design System

Paleta única do produto (light + dark), alinhada à logomarca grid-heart viva.

## Light mode

| Token | Hex | Uso |
|-------|-----|-----|
| **Primary** | `#9333EA` | Botões, “Care”, gradiente (fim) |
| Primary hover | `#A855F7` | Hover de ações primárias |
| Primary active | `#7E22CE` | Pressed |
| Primary bg | `#F3E8FF` | Fundos suaves primários |
| Primary border | `#E9D5FF` | Bordas primárias |
| **Accent** | `#FF3DA8` | Links, “Aiyra”, gradiente (início) |
| Accent hover | `#FF5BC4` | Hover de links |
| Accent bg | `#FCE7F3` | Fundos de destaque rosa |
| **Insight / rede** | `#FFE566` | IA, coração da logo, insights |
| Background | `#F8FAFC` | Layout |
| Surface | `#FFFFFF` | Cards |
| Text | `#1E293B` | Texto principal |
| Text secondary | `#64748B` | Tagline, metadados |
| Border | `#E2E8F0` | Divisores |
| Success | `#10B981` | Sucesso |
| Error | `#EF4444` | Erro |

## Dark mode (proposta)

Primárias mais luminosas para contraste em fundo escuro; superfícies neutras escuras.

| Token | Hex | Uso |
|-------|-----|-----|
| **Primary** | `#A855F7` | Botões, “Care” (dark logo) |
| Primary hover | `#C084FC` | Hover |
| Primary active | `#9333EA` | Pressed |
| Primary bg | `#2E1065` | Fundos primários escuros |
| Primary border | `#581C87` | Bordas primárias |
| **Accent** | `#FF5BC4` | Links, “Aiyra” (dark logo) |
| Accent hover | `#FF7AD4` | Hover de links |
| Accent bg | `#500724` | Fundos de destaque |
| **Insight / rede** | `#FFE566` | IA e rede do coração (igual light) |
| Background | `#0f0f0f` | Layout |
| Surface | `#1a1a1a` | Cards |
| Text | `#f1f5f9` | Texto principal |
| Text secondary | `#94a3b8` | Tagline (dark logo) |
| Border | `#334155` | Divisores (dark logo) |
| Success | `#34D399` | Sucesso (mais legível no escuro) |
| Error | `#F87171` | Erro |

## Logomarca

| Variante | Light | Dark |
|----------|-------|------|
| Horizontal | `public/brand/logo-horizontal.svg` | `logo-horizontal-dark.svg` |
| Quadrada | `logo-square.svg` | `logo-square-dark.svg` |
| Ícone | `logo-icon.svg` | `logo-icon-dark.svg` |

- Coração **90%** do box gradiente; horizontal com wordmark + linha + tagline na **mesma altura** do box (88px).
- Regenerar: `node packages/web/scripts/gen-heart-grid.mjs`
- Raster PNG: `npx @resvg/resvg-js-cli public/brand/logo-icon.svg public/brand/favicon-32.png --fit-width 32`
- Sync Open Design: `node packages/web/scripts/sync-brand-to-opendesign.mjs`

## Open Design

Tokens em `%APPDATA%\Open Design\...\aiyra-care-platform-for-users-and-patients\system\` — paleta `aiyra` apenas (indigo/teal/rose removidos do produto).
