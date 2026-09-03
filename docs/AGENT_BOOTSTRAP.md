# Agent bootstrap — índice obrigatório

> **Propósito:** sobreviver à **compactação de contexto**. Texto curto re-injetado via hook `sessionStart` e `postToolUse` (pós-compact).  
> **Não duplicar** conteúdo longo aqui — só o **índice de verificação**.

## Ordem de leitura (antes de código de produto)

| # | Recurso | Para quê |
|---|---------|----------|
| 1 | `GET /project/context` ou `docs/project-context.json` | Estado do app, domínios, decisões, features |
| 2 | `docs/features/index.json` → card em `docs/features/<id>.md` | **Para quê** existe a capacidade |
| 3 | `docs/roadmap.json` (item/épico relevante) | Status de entrega |
| 4 | `docs/DOCUMENTATION_SYSTEM.md` | Ritual ao entregar |
| 5 | Doc de domínio linkado na feature (`seeAlso`) | Profundidade técnica |

## Ritual ao entregar (obrigatório)

1. `docs/roadmap.json` — `status` + `detail`
2. `docs/features/<id>.md` + entrada em `docs/features/index.json`
3. Decisão relevante → `docs/HISTORICO.md`
4. Afeta usuário → `docs/help/<tópico>.md`
5. Issue/PR → label `roadmap:<item-id>`

## Acordos de trabalho (sempre válidos)

| Doc | Conteúdo |
|-----|----------|
| `AGENTS.md` | Stack, comandos, arquitetura, hooks |
| `docs/CURSOR_AGENT_OPS.md` | Guard-rails, skills tier, hooks |
| `docs/DELIVERY_PIPELINE.md` | Gates `promotion:gates`, preview |
| `docs/FEATURE_REVIEW_FRAMEWORK.md` | Tier 0–3 antes de merge |

## API rápida

- Roadmap UI: `GET /roadmap`
- Contexto LLM: `GET /project/context` (inclui catálogo `features`)
- Hub docs: `docs/README.md`

## Não fazer

- Inferir “para quê” só pelo código — ler feature card primeiro.
- Feature card por componente React — uma card por **capacidade**.
- GitHub Project como fonte de verdade — espelho com label `roadmap:<id>`.
