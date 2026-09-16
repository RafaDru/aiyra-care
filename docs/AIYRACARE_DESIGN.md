# AiyraCare — Design System (Ant Design)

Tokens em `packages/web/src/theme/aiyracare-tokens.ts`, aplicados via `ConfigProvider` em `ThemeProvider.tsx`.

Paleta completa: [AIYRACARE_PALETTE.md](./AIYRACARE_PALETTE.md)

| Token | Light | Dark |
|-------|-------|------|
| `colorPrimary` | `#9333EA` | `#A855F7` |
| `colorInfo` / `colorLink` | `#FF3DA8` | `#FF5BC4` |
| `colorWarning` | `#FFE566` | `#FFE566` |
| `borderRadius` | `12px` | — |
| `fontFamily` | Inter | — |

## Modo claro / escuro

Apenas a paleta **Aiyra** (sem indigo/teal/rose). Toggle no header e em Configurações; `localStorage` `aiyracare-dark-mode`.

## Logomarca

Assets em `packages/web/public/brand/` — SVG light/dark para horizontal, quadrada e ícone.

- **Símbolo:** coração em rede `#FFE566` sobre gradiente rosa→roxo
- **Wordmark:** Aiyra `#FF3DA8` / Care `#9333EA` (dark: `#FF5BC4` / `#A855F7`)
- **Tagline:** AiyraCare Platform `#64748B` (dark: `#94a3b8`)

Regenerar: `node packages/web/scripts/gen-heart-grid.mjs`

## Telas (Open Design)

Novas telas devem seguir spec em `docs/opendesign/pages/` antes da implementação. Auth: [opendesign/pages/auth.md](./opendesign/pages/auth.md).

## Componentes de IA

Use `AiInsightCard` — borda e sombra com `colorWarning` (`#FFE566`).
