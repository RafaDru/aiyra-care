# Failure Probes — captura CH (tier 2)

| Campo | Valor |
|-------|--------|
| **ID** | `failure-probes-ch` |
| **Épico** | `failure-probes-ch` |
| **Status** | `in_progress` (M1 web, M3 mobile) |
| **Categoria** | técnico |
| **Prioridade** | P0 |
| **Tier review** | 2 (ops + LGPD técnica; sem conteúdo clínico novo) |

## Resumo

Camada **default-on** de captura de falhas user-impacting (UI sem fallback, API 5xx sem workaround) com ingest silenciosa, fingerprint e cadeia automática **INC** no Command Hub. Evolui `client_errors` e o bridge allowlist atual para modelo **opt-out por feature**.

## Objetivo de negócio

- Detectar regressões reais sem depender só de «Reportar problema»
- Manter operador solo: ruído controlado via `MIN_COUNT`, dedupe e manutenção planejada
- Base reutilizável para outros produtos CH no longo prazo

## Comportamento (usuário)

- Sem UI nova na v1: erros continuam com mensagens existentes
- Contexto técnico enviado em background (sem PHI)
- Relato humano opcional via [`support-user-reports`](./support-user-reports.md)

## MVP (Rafael 2026-10-06)

- **Web:** React SDK — evoluir `packages/web/src/lib/client-errors.ts`
- **Mobile:** React Native — `packages/mobile/src/lib/client-errors.ts`
- Bridge blocklist `CLIENT_ERROR_INCIDENT_FEATURES_DISABLED` (M2 parcial — **3A** `ava_companion`) + suite QA (após M2 completo)

## Superfície técnica

| Tipo | Referência |
|------|------------|
| Spec canônica | [`docs/ops/FAILURE_PROBES_CH.md`](../ops/FAILURE_PROBES_CH.md) |
| Ingest hoje | `POST /telemetry/client-errors` · tabela `client_errors` (051) |
| Bridge INC | `ClientErrorIncidentBridgeService` (078) — migração para default-on |
| Web (MVP) | `packages/web/src/lib/client-errors.ts` |
| Mobile (MVP) | `packages/mobile/src/lib/client-errors.ts` |
| API 5xx hook | Prefixo bridge existente — **não** parte do produto Failure Probe |

## Fora de escopo MVP

- Backend Failure Probe / Fastify plugin (pós-MVP doc)
- SDK Angular; nativo iOS/Android (pós-MVP doc)
- Notificar usuário quando defeito corrigido (roadmap doc only)
- Substituir alertas ops / SRE

## Dependências

- [`CLIENT_ERROR_INCIDENT_BRIDGE.md`](../ops/CLIENT_ERROR_INCIDENT_BRIDGE.md)
- [`OPS_PLANNED_MAINTENANCE.md`](../ops/OPS_PLANNED_MAINTENANCE.md)
- [`CH_AUTONOMOUS_OPS_STACK.md`](../ops/CH_AUTONOMOUS_OPS_STACK.md)

## Status no quadro de produto

Refletido em [`docs/product/PRODUCT_MATURITY_BOARD.json`](../product/PRODUCT_MATURITY_BOARD.json) (domínio **Observabilidade** → item `failure-probes`, maturidade **partial**, nota Web M1 + RN M3). UI: Command Hub **Produto → Maturidade**.

## QA

- Regressão bridge: [`client-error-ch-bridge`](../testing/suites/client-error-ch-bridge.md)
- M1 web: `cd packages/web && npx vitest run tests/failure-probe-policy.test.ts` + `cd packages/api && npx vitest run tests/client-error.test.ts`
- M3 mobile: `cd packages/mobile && npm run test` + `npm run typecheck` (sem E2E device — validação unitária + typecheck)
- Planejado (M2+): suite `failure-probes-ch`

## Reviews (tier 2)

- Legal: minimização / sem PHI em PG — alinhado a telemetria existente
- Security: auth ingest, sem stack em webhook
- Business: [`aiyracare-review-business-domain`](../../.cursor/skills/aiyracare-review-business-domain/SKILL.md) — boundary Connect vs probe
- Medical: **3A** — `ava_companion` fora do bridge INC (default disabled); ingest continua
