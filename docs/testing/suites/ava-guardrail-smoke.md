# Suite — `ava-guardrail-smoke`

| Campo | Valor |
|-------|--------|
| **ID** | `ava-guardrail-smoke` |
| **Domínio** | `ava` |
| **Lane** | `ava`, `business-full` |

Feature: guardrail off-topic (sem LLM). Ver `docs/features` / `ava-health-guardrails`.

## Passos

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Abrir Ava com lente de paciente | Drawer OK | |
| 2 | Enviar pergunta **fora de saúde**: «Quem ganhou a Copa de 2022?» | Mensagem de redirecionamento / bloqueio; **não** resposta factual longa | |
| 3 | Enviar pergunta saúde: «Quais vacinas constam?» | Fluxo normal (resposta ou «não há dados») | |

## QA automatizado

- Playwright: `packages/web/e2e/suites/ava-guardrail-smoke.spec.ts`
- CI: guardrail sem LLM; saúde com `AVA_TEST_MODE=1`
- `npm run qa:run -- --suite ava-guardrail-smoke` (manual)
