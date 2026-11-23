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
- [ ] Viewport ≤768px **com** touch/coarse pointer **ou** PWA `standalone` (DevTools device emulation)

## Cenários

### A — Manifest e ícone

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | `GET /manifest.webmanifest` | 200; `theme_color` `#FFF7FB`; ícones 192/512 | |
| 2 | Inspecionar `apple-touch-icon` / `pwa-icon-192` | Fundo silk claro, coração colorido (não royal roxo) | |

### B — Layout compacto autenticado (refinamento Neri FAB)

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Login → dashboard em viewport 390px (device mode) | Sem sider; bottom nav 5 itens; centro **rosto Neri** | |
| 2 | Toque **Sua família** | Rota `/family` | |
| 3 | Toque **Neri** (círculo central) | Abre **drawer chat Ava** (não Registro rápido); orb Ava oculto | |
| 4 | FAB **+** inferior direito → **Registro rápido** (roxo) | `QuickCaptureSheet` | |
| 5 | FAB **+** → **Fazer um pedido** | Fluxo resumo consulta (`PatientConsultVisitHost`) | |
| 6 | Toque **Serviços** | Folha: Config, Ajuda, tema, idioma, sair | |
| 7 | Header compact | Lockup horizontal (coração + wordmark); gradiente branco→rosa | |
| 8 | Largura ≥992px (desktop, fine pointer) | Sider; sem bottom nav; sem FAB stack; Ava dock + Registro no header | |

**Automação:** parcial — ver `auth-entry-flow` para login; checks B manuais ou DevTools.

## Regressão

Após alterar `AppLayout`: `npm run qa:run -- --suite auth-entry-flow`.