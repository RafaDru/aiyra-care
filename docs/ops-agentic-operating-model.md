# Modelo operacional agêntico (AiyraCare)

**Canônico:** [`OPS_SOLO_OPERATOR_CHARTER.md`](./OPS_SOLO_OPERATOR_CHARTER.md)

## Resumo

- **1 humano**, sem receita; operação técnica **100% agêntica** onde possível.
- Rafael: **decisões** (produto, arquitetura, política) — não merges, não review de código, não runbook manual no notebook.

## Command Hub (`:3013`)

| Etapa | Quem executa |
|-------|----------------|
| Falha → INC (bridge / alertas) | Sistema + agente config |
| Dispatch triagem / correção / review PR | Cursor Automations |
| CI, `in_fix`, registrar PR, métricas | Código + agente |
| Aprovação CH pré-merge GitHub | **Agente** (API/automation), não Rafael |
| Merge GitHub → `fixed` | Webhook R4 + **merge agêntico** quando verde |

## Notebook / ambiente local

Agentes com worker no notebook (`docs/CURSOR_WORKSPACE.md`, `scripts/cursor-worker-start.ps1`) executam pull, migrações, restart, piloto `qa:run`, webhooks — **sem** delegar checklist ao Rafael.

## Entrega de software

1. Agente implementa na branch → PR.
2. CI + `test:ops` / `test:critical` / suite QA aplicável.
3. Agente corrige falhas e **merge em `main`** quando gates passam.
4. Rafael só entra se houver **decisão** documentada em `HISTORICO.md` ou pergunta explícita de política.

## Anti-padrões (não repetir)

- «Merge G3 quando você quiser»
- «Revise a PR #N»
- «No notebook rode…» (para Rafael)

Substituir por: agente executa ou agenda automation; humano recebe **resultado** + **decisão pendente** (se houver).
