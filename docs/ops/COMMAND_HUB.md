# Command Hub (CH)

> **Última atualização:** 2026-09-24  
> Nome oficial da **plataforma interna** AiyraCare: observabilidade, alertas, suporte, métricas de produto/negócio e console `:3013`.

**Acrônimo:** **CH** (uso em chat, issues, Project: «frente CH», «aba CH Suporte»).

---

## O que é o CH

| Camada | Descrição |
|--------|-----------|
| **Command Hub (marca)** | Backoffice interno — o que Rafael e agentes operam além do app família (Web/App) |
| **Console** | UI em `packages/ops-console` — título **Command Hub** no app (`:3013` integração) |
| **Backend CH** | Rotas `/ops/*`, serviços em `packages/api/src/application/ops`, telemetria, `support_reports` |
| **Worker / alertas** | `connect-worker` (ciclos ops), `ops:alerts-check`, probe — épico roadmap `prod-run-intelligence` |

O termo legado **«Ops»** permanece em paths técnicos (`docs/ops/`, `test:ops`, `OPS_METRICS_KEY`) até rename opcional pós-MVP.

---

## Documentação CH

| Doc | Uso |
|-----|-----|
| [`README.md`](./README.md) | Hub da sessão Cursor CH |
| [`OPS_MVP_SCOPE.md`](./OPS_MVP_SCOPE.md) | Escopo MVP (preview pausado) |
| [`CONSOLE.md`](./CONSOLE.md) | Layout CH + telas por grupo |
| [`RUNBOOK_ALERTS.md`](./RUNBOOK_ALERTS.md) | Alertas |
| [`TELEMETRY.md`](./TELEMETRY.md) | PG / LGPD |
| [`../OBSERVABILITY.md`](../OBSERVABILITY.md) | Arquitetura |

---

## Pacotes (nomes técnicos atuais)

| Pacote / path | Papel no CH |
|---------------|-------------|
| `packages/ops-console` | Frontend Command Hub |
| `packages/api/.../ops` | API métricas, alertas, fila análise |
| `packages/api/.../telemetry` | `product_events`, `client_errors` |
| `packages/api/.../support-report` | Reportar problema (061) |

---

## Sessão Cursor

Rule opcional: `.cursor/rules/aiyra-ops-session.mdc` (título histórico; conteúdo alinhado ao **CH**).

Foco atual: ambiente único integração — ver [`OPS_MVP_SCOPE.md`](./OPS_MVP_SCOPE.md).
