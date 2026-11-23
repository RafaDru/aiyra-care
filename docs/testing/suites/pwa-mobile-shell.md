# Suite — `pwa-mobile-shell`

| Campo | Valor |
|-------|--------|
| **ID** | `pwa-mobile-shell` |
| **Domínio** | `conta` / shell |
| **Lane** | `regression` |
| **Feature** | `beta-pwa-mobile-shell` |

PWA instalável (ícone light) e navegação compacta pós-login.

## Pré-requisitos

- [ ] Web build (`packages/web/dist`) ou `:5173`
- [ ] Viewport ≤768px **ou** Chrome DevTools device + opcional «Display: standalone» em Application

## Cenários

### A — Manifest e ícone

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | `GET /manifest.webmanifest` | 200; `theme_color` `#FFF7FB`; ícones 192/512 | |
| 2 | Inspecionar `apple-touch-icon` / `pwa-icon-192` | Fundo silk claro, coração colorido (não royal roxo) | |

### B — Layout compacto autenticado

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Login → dashboard em viewport 390px | Sem sider; barra com 5 itens; **Neri** central elevada | |
| 2 | Toque **Neri** (centro) | Abre sheet **Registro rápido** | |
| 3 | Toque **Serviços** | Folha inferior: Config, Ajuda, tema, sair | |
| 4 | Orb Ava no canto | **Ausente** no compact | |
| 5 | Largura ≥992px | Sider desktop; sem bottom nav; Ava orb visível | |

**Automação:** parcial — ver `auth-entry-flow` para login; checks B são manuais ou DevTools até spec dedicado.

## Regressão

Após alterar `AppLayout`: `npm run qa:run -- --suite auth-entry-flow`.