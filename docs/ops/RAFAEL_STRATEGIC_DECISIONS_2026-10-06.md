# Decisões estratégicas — ingress CH / ops (2026-10-06)

**Operador:** Rafael Drummond · **Status:** fila §8 encerrada · **Índice canônico** (uma linha por tema).

| # | Resposta | Resumo |
|---|----------|--------|
| 1 | **1A** | Bridge piloto agressivo (INC rápido, mais triagem) |
| 2 | **MVP probes** | Failure Probes default-on — **Web (React) + Mobile (RN)**; item allowlist legado absorvido |
| 3 | **3A** | Ava: telemetria/probe sim; **sem** auto-INC no bridge (`ava_companion` na blocklist) |
| 4 | **4B** | Lane triagem SRE para `integration_links` **só em produção**; dev/preview = dev |
| 5 | **5A** | **Sem** auto «aprovar merge no CH» após revisão (`CH_G3_AGENTIC_AUTO_APPROVE` off) |
| 6 | **6C** | API **sem** trava obrigatória de revisão para aprovar merge (`CH_G3_REQUIRE_REVIEW_APPROVE` off) |
| 7 | **7A + tag** | Alertas ops **não** suprimidos em manutenção; INC com «Manutenção ativa» / `plannedMaintenanceActive` |
| 8 | **8C + aviso** | Revisão automática **não** exige CI verde; resultado da revisão **mostra** status do CI |

## Onde está detalhado

| Documento | Conteúdo |
|-----------|----------|
| [`CLIENT_ERROR_INGRESS_PROD_POLICY.md`](./CLIENT_ERROR_INGRESS_PROD_POLICY.md) §8 | Texto completo das opções + blocos «Decidido» |
| [`FAILURE_PROBES_CH.md`](./FAILURE_PROBES_CH.md) | Sondas de falha (decisão 2) |
| [`OPS_PLANNED_MAINTENANCE.md`](./OPS_PLANNED_MAINTENANCE.md) | Flag manutenção + tag 7A |
| [`CH_G3_AGENTIC_APPROVAL.md`](./CH_G3_AGENTIC_APPROVAL.md) | Aprovar merge no CH (5A / 6C) |
| [`CH_GLOSSARY.md`](./CH_GLOSSARY.md) | Nomes em português (Command Hub, revisão, triagem) |
| [`OPS_SOLO_OPERATOR_CHARTER.md`](../OPS_SOLO_OPERATOR_CHARTER.md) | Operador solo; execução e merge agênticos |

## Env principais (notebook default)

| Variável | Decisão | Default alinhado |
|----------|---------|------------------|
| `CLIENT_ERROR_INCIDENT_BRIDGE` | 1A | `1` piloto |
| `CLIENT_ERROR_INCIDENT_FEATURES_DISABLED` | 3A | `ava_companion` |
| `CLIENT_ERROR_INCIDENT_SRE_FEATURES` | 4B | lane SRE só `DEPLOYMENT_TIER=production` |
| `CH_G3_AGENTIC_AUTO_APPROVE` | 5A | `0` |
| `CH_G3_REQUIRE_REVIEW_APPROVE` | 6C | `0` |
| `OPS_PLANNED_MAINTENANCE` | 7A | bridge/5xx suppress; ops_alert com tag |
| `CH_PR_REVIEW_REQUIRE_CI_GREEN` | 8C | `0` + aviso CI no resultado da revisão |

Atualizar este índice quando houver nova rodada de decisões §8 ou política de prod.
