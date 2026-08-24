# Pipeline de entrega — dev → beta → run

> **Última atualização:** 2026-08-24  
> Roadmap: épicos `dev-delivery-pipeline`, `prod-run-intelligence` em `docs/roadmap.json`.

## Princípio

Operar com o **mínimo necessário**: cada gate tem custo; só endurecer onde o risco justifica (saúde + LGPD + dados sensíveis).

## Ciclo mínimo (Build)

```mermaid
flowchart LR
  A[Pedido / issue] --> B[AGENTS.md + skills]
  B --> C[Implementação]
  C --> D[Hooks pré/pós]
  D --> E[Testes locais]
  E --> F[Tier review skill]
  F --> G[CI GitHub]
  G --> H[Commit + push]
```

| Etapa | Ferramenta | Obrigatório |
|-------|------------|-------------|
| Contexto | `AGENTS.md`, `docs/project-context.json`, `GET /project/context` | Sim |
| Classificação | Skill `aiyracare-feature-release` (tier 0–3) | Tier ≥ 2 |
| Guard-rails IDE | `.cursor/hooks.json` (auditoria + bloqueios) | Sim |
| Testes API | `npm run test:critical` + `vitest run` para área tocada | Sim |
| Build web | `cd packages/web && npm run build` | Se web |
| CI | `.github/workflows/ci.yml` | Automático em PR/main |
| Revisão humana | `human-review-gates` (legal, fiscal, médico) | Go-live público |

## Gates por tier (resumo)

Ver `docs/FEATURE_REVIEW_FRAMEWORK.md`.

| Tier | Exemplo | Antes de merge |
|------|---------|----------------|
| 0 | CSS, i18n | Opcional |
| 1 | Nova aba UI | Business skill |
| 2 | Sync, upload, billing, API | Legal + security + business |
| 3 | IA clínica, share token, delete conta | Todas + humano antes de prod |

## CI atual e próximo

**Hoje:** API `tsc`, agents Python import, **vitest critical**, web `tsc + vite build`.

**Backlog P2:** smoke E2E mínimo (login → paciente → exames); migration dry-run em PR.

## Auditoria de desenvolvimento

Eventos em `docs/dev-audit/*.jsonl` via Cursor hooks — ver `docs/dev-audit/README.md`.

Não substitui git history; complementa com **processo agente** (shell, edits, sessões).

## Fase Run (produção)

Épico `prod-run-intelligence` — captura inteligente de falhas sem PHI:

1. `product_events` (opt-in, allowlist de propriedades)
2. Alertas `sync_jobs` stuck / fail rate
3. Alerta cascata LLM 100% fail + teto interno R$100
4. Correlação `llm_usage_events` + `product_events` para triagem
5. Runbook `docs/OBSERVABILITY.md` + `docs/EMERGENCY.md`

**Não** incluir na fase Run inicial: mapa de temas na UI, analytics NLP em tempo real.

## MVP beta checklist

1. Deploy estável (API + web + connect-worker + PG)
2. `COMPLIANCE_GATE_ENABLED=1` + textos revisados
3. CI verde (build + critical tests)
4. Onboarding self-service (conta → paciente → 1 integração)
5. Monitoramento básico (health, sync, LLM budget)
