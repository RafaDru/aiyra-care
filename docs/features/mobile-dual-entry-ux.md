# Mobile — dual entry (Registro rápido + Ava)

| Campo | Valor |
|-------|--------|
| **ID** | `mobile-dual-entry-ux` |
| **Épico** | `plat-mobile` |
| **Status** | `in_progress` |
| **Categoria** | negócio |
| **Prioridade** | P1 |

## Resumo

Dois pontos de entrada globais no shell Expo autenticado: **Registro rápido** (FAB inferior esquerdo) e **Ava** (FAB inferior direito). Espelha a hierarquia do web — botão «Registro rápido» no header + orb Ava — adaptada à thumb zone mobile e à ausência de header persistente.

## Objetivo de negócio

- Registro grava dado estruturado em &lt;30s (nota, sintoma, medição; demais kinds em paridade com web).
- Ava interpreta, orienta e acelera G1 com lente de paciente.
- Entradas complementares, não concorrentes.

## Comportamento (usuário)

1. Após login + compliance + unlock biométrico (se ativo), em qualquer rota de `(app)/_layout` o usuário vê os dois FABs (quando há perfil de saúde resolvido para Ava — ver abaixo).
2. **Registro (`+`, esquerda):** abre `QuickCaptureSheet` com seletor de paciente e kinds.
3. **Ava (direita):** abre modal de chat com lente de paciente, conversas e aceleradores.
4. Deep link programático: `requestQuickCaptureOpen` / `subscribeAvaOpen` (buses espelhando web).

### Quando os FABs não aparecem

| Condição | Registro | Ava |
|----------|----------|-----|
| Auth loading, sem sessão, unlock biométrico pendente | Ocultos | Ocultos |
| Fora de `(app)/_layout` (welcome, login, auth) | Ocultos | Ocultos |
| Lente ainda carregando (`useAvaPatientLens`) | Oculto | Oculto |
| Conta sem perfis de saúde | **Visível** (sheet pede paciente) | Oculto (paridade web `AvaGlobalDock`) |
| Modal/sheet aberto | FABs permanecem atrás do modal | |

## Paridade web

| Web | Mobile |
|-----|--------|
| `AppLayout` — header «Registro rápido» + `QuickCaptureGlobal` | FAB `+` outline, canto inferior esquerdo |
| `AvaGlobalDock` — orb fixo inferior direito | FAB primário «Ava», canto inferior direito |
| `quick-capture-bus.ts` (5 kinds; `symptom` via thread no mobile) | `packages/mobile/src/lib/quick-capture-bus.ts` (+ `symptom`) |

**First visit / tour:** `first-visit-guided-ux` permanece **somente web** até redesign do onboarding; não portar `FirstVisitTourDrawer` no Expo nesta entrega.

## Layout e tokens

Constantes em `packages/mobile/src/lib/dual-entry-layout.ts`:

| Token | Valor | Uso |
|-------|-------|-----|
| `DUAL_ENTRY_FAB_BOTTOM_OFFSET` | `56` | Acima da tab bar (~49–56dp) |
| `DUAL_ENTRY_EDGE_INSET` | `AIYRACARE_TOKENS.padding` | Margem horizontal |
| `DUAL_ENTRY_FAB_RADIUS` | `AIYRACARE_TOKENS.borderRadius` | FABs e chips do sheet |
| `DUAL_ENTRY_FAB_SHADOW` | sombra leve compartilhada | Elevação visual |
| `DUAL_ENTRY_Z_INDEX_QUICK_CAPTURE` | `99` | Registro |
| `DUAL_ENTRY_Z_INDEX_AVA` | `100` | Ava (acima se sobreposição) |

Posição vertical: `bottom = max(safeArea.bottom, 16) + DUAL_ENTRY_FAB_BOTTOM_OFFSET`.

Tamanhos: Registro **48×48** (borda `colorPrimary`, fundo `colorBgContainer`); Ava **56×56** (fundo `colorPrimary`, label branca).

A11y: `accessibilityRole="button"`; labels `quickCapture.triggerA11y` / `ava.openChat` (pt-BR + en).

## Superfície técnica

| Tipo | Referência |
|------|------------|
| Layout autenticado | `packages/mobile/app/(app)/_layout.tsx` |
| Registro | `QuickCaptureGlobal`, `QuickCaptureSheet`, `quick-capture-bus.ts` |
| Ava | `AvaGlobalDock`, `ava-dock-bus.ts`, `useAvaPatientLens` |
| Web espelho | `packages/web/src/components/layout/AppLayout.tsx` |

### Kinds — registro rápido

| Kind | Web | Mobile (2026-10) |
|------|-----|------------------|
| `note` | ✅ | ✅ health thread entry |
| `symptom` | (via thread) | ✅ health thread entry |
| `measurement` | ✅ batch | ✅ `POST /measurements/batch` |
| `medication` | ✅ | UI + «Em breve» |
| `agenda` | ✅ | UI + «Em breve» |
| `document` | ✅ upload | UI + «Em breve» |

## Fora de escopo

- Tour «Primeiros passos» mobile (`FirstVisitTourDrawer`).
- Long-press no FAB Ava como atalho de registro (falha WCAG sem alternativa visível).
- Redesign Ant Design Mobile dedicado; Metro E2E device na cloud.

## QA (obrigatório ao entregar)

| Campo | Valor |
|-------|--------|
| **Suite** | [`mobile-shell-smoke`](../testing/suites/mobile-shell-smoke.md) (passo dual FAB) |
| **Comando** | `npm run qa:run -- --suite mobile-shell-smoke` |
| **Estrutural** | `cd packages/mobile && npm run typecheck` · `packages/mobile/tests/dual-entry-layout.test.ts` |

## Ver também

- [`mobile-app-shell.md`](./mobile-app-shell.md)
- [`MOBILE_WEB_DUAL_DELIVERY.md`](../MOBILE_WEB_DUAL_DELIVERY.md)
- [`AVA_OPERATIONAL.md`](../AVA_OPERATIONAL.md)
- [`first-visit-guided-ux.md`](./first-visit-guided-ux.md) (web only até redesign onboarding)
