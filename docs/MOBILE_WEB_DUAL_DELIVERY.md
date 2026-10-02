# Entrega dual Web + Mobile (80/20)

> **Decisão (2026-09-21):** capacidades de produto devem ser pensadas **uma vez** e entregues **nos dois clientes** (`packages/web` e `packages/mobile`), exceto quando a plataforma impõe exceção explícita.

## Princípio 80/20

| Faixa | O quê | Web | Mobile |
|-------|--------|-----|--------|
| **80%** | Jornadas de conta, lista, perfil, leitura clínica/plano, Ava, família, compliance | Implementação completa | **Mesma API**, UX nativa, leitura + deep link para o que ainda exige browser |
| **20%** | Sync Playwright/CDP, upload pesado, admin/ops, Microsoft OAuth (fase atual), marcadores/CRUD avançado | Referência | Link «Abrir no navegador» ou web-only documentado na feature card |

**Regra:** se um PR altera fluxo de negócio visível ao usuário no web, o agente pergunta «qual o espelho mobile?» antes de fechar — mesmo que o espelho seja só placeholder + link web na mesma entrega.

## Exceções permitidas (documentar na feature card)

1. **Automação de browser** — integrações com login em portal (sync modal, CDP Amil).
2. **Ferramentas internas** — ops console, scripts, workers.
3. **Capacidades do SO** — notificações desktop, extensões, impressão A4.
4. **OAuth/provider** — até estar na allow list mobile (ex.: Microsoft).
5. **Performance / arquivo** — visualização PDF grande, editor rico — mobile abre web.

Cada exceção precisa de linha na tabela **Web-only** em `docs/features/mobile-app-shell.md` ou na ficha da feature.

## Ritual de entrega (agente / dev)

1. **Bootstrap:** `docs/features/<id>.md` + `packages/web/src/lib/patient-navigation.ts` (se paciente) + `packages/mobile/src/lib/patient-navigation.ts` (manter paridade de chaves).
2. **API:** contrato único em `packages/api` — mobile não duplica BFF.
3. **Tokens:** `@aiyra-care/design-tokens` — não copiar cores soltas.
4. **UI mobile:** componente em `packages/mobile/src/components/<domínio>/`; rota Expo espelhando path web quando fizer sentido.
5. **QA:** `npm run mobile:check` + suite `mobile-shell-smoke` se tocou auth, paciente ou tab já coberta.
6. **Ops:** aba **Produto → Mobile** no Command Hub (`docs/ops/CONSOLE.md`).

## Mapa de referência

| Web | Mobile |
|-----|--------|
| `packages/web/src/pages/login.tsx` | `packages/mobile/app/(auth)/login.tsx` |
| `packages/web/src/lib/patient-navigation.ts` | `packages/mobile/src/lib/patient-navigation.ts` |
| `PatientWalletTab` / `CoverageTab` / `ExamsTab` | `PatientWalletTab`, `PatientCoverageTab`, `PatientExamsTab` |
| Plano detalhado | `docs/features/mobile-app-shell.md` + Project store `docs/mobile-parity-plan.md` |

## Roadmap

Épico `plat-mobile` em `docs/roadmap.json` — status `in_progress`; itens de feature devem citar paridade mobile quando tier ≥ 1.

**Sequência de produto (app):** [`MOBILE_EVOLUTION_BLOCKS.md`](./MOBILE_EVOLUTION_BLOCKS.md) — Bloco 1 transacional antes de gráficos, Ava avançada ou redesign.
