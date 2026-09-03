# Documentação AiyraCare

> Hub de navegação — ver [`DOCUMENTATION_SYSTEM.md`](./DOCUMENTATION_SYSTEM.md) para o modelo completo.

## Comece aqui

| Documento | Para quê |
|-----------|----------|
| [`PROJETO.md`](./PROJETO.md) | Visão viva do produto, fluxos, entidades |
| [`roadmap.json`](./roadmap.json) + [`ROADMAP.md`](./ROADMAP.md) | Entregas P0–P4 (UI: `/roadmap`) |
| [`project-context.json`](./project-context.json) | Snapshot para LLMs (`GET /project/context`) |
| [`features/`](./features/) | Ficha por capacidade de produto |
| [`help/`](./help/) | FAQ e textos de ajuda (usuário + Ava) |
| [`HISTORICO.md`](./HISTORICO.md) | Decisões datadas |

## Por área

### Produto e negócio

- [`ECOSYSTEM.md`](./ECOSYSTEM.md) — personas, monetização
- [`B2B_PARTNERS.md`](./B2B_PARTNERS.md) — parceiros B2B
- [`FAMILY_ACCESS_MODEL.md`](./FAMILY_ACCESS_MODEL.md) — conta × família × perfil de saúde
- [`ACCOUNT_AND_PLAN.md`](./ACCOUNT_AND_PLAN.md) — `/settings/*`

### Clínico e dados

- [`ARCHITECTURE_DATA_LAYERS.md`](./ARCHITECTURE_DATA_LAYERS.md) — Postgres vs Neo4j
- [`DATA_HYGIENE.md`](./DATA_HYGIENE.md) — deduplicação
- [`CLASSIFICATION_ENGINE.md`](./CLASSIFICATION_ENGINE.md) — rótulos Amil/sync
- [`EXAM_ARTIFACT_PIPELINE.md`](./EXAM_ARTIFACT_PIPELINE.md) — laudos → marcadores
- [`SYNC_DELTA.md`](./SYNC_DELTA.md) — sync incremental por portal

### Ava e IA

- [`AVA_VISION.md`](./AVA_VISION.md) — companion global
- [`AVA_OPERATIONAL.md`](./AVA_OPERATIONAL.md) — fases G1–G4
- [`AVA_PATIENT_LENS.md`](./AVA_PATIENT_LENS.md) — lente de paciente
- [`LLM_USAGE.md`](./LLM_USAGE.md) — metering e orçamento interno

### Integrações

- [`CONNECT.md`](./CONNECT.md) — boundary Connect vs Core
- [`SUS_CONECTESUS.md`](./SUS_CONECTESUS.md) — gov.br / SUS
- [`FLEURY_PRECISION_CARE.md`](./FLEURY_PRECISION_CARE.md) — Hermes / Grupo Fleury

### Operação e entrega

- [`DELIVERY_PIPELINE.md`](./DELIVERY_PIPELINE.md)
- [`TESTING_VERTICALS.md`](./TESTING_VERTICALS.md)
- [`infra/ENVIRONMENTS.md`](./infra/ENVIRONMENTS.md)
- [`infra/ENV_PREVIEW.md`](./infra/ENV_PREVIEW.md) · [`infra/PREVIEW_LOCAL_TEST_GUIDE.md`](./infra/PREVIEW_LOCAL_TEST_GUIDE.md)
- [`infra/LOCAL_HOSTNAMES.md`](./infra/LOCAL_HOSTNAMES.md) · [`infra/GCP_PREVIEW_RUNBOOK.md`](./infra/GCP_PREVIEW_RUNBOOK.md)
- [`OBSERVABILITY.md`](./OBSERVABILITY.md)

### Regulatório

- [`LEGAL_COMPLIANCE.md`](./LEGAL_COMPLIANCE.md)
- [`legal/`](./legal/) — termos versionados

## Para agentes Cursor

- Raiz: [`AGENTS.md`](../AGENTS.md)
- Skills: `.cursor/skills/aiyracare-*`
- Features index: [`features/index.json`](./features/index.json)
