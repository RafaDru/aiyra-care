# Testes — hub operacional QA

> **Última atualização:** 2026-09-08  
> Modelo: testes **manuais solicitáveis** em paralelo + caminho para **E2E automatizado** por feature.

## Comece aqui

| Documento | Para quê |
|-----------|----------|
| [`QA_PROCESS.md`](./QA_PROCESS.md) | Processo completo — Definition of Done, lanes paralelas, gates `main` |
| [`MANUAL_TEST_RUNBOOK.md`](./MANUAL_TEST_RUNBOOK.md) | Como **solicitar** e executar um teste manual (agente ou humano) |
| [`PARALLEL_QA_MODEL.md`](./PARALLEL_QA_MODEL.md) | Vários “analistas QA” simultâneos — massa isolada por suite |
| [`AUTOMATION_ROADMAP.md`](./AUTOMATION_ROADMAP.md) | Evolução manual → Playwright → CI |
| [`suites/index.json`](./suites/index.json) | Catálogo machine-readable de todas as suites |
| [`fixtures/`](./fixtures/) | Massas de teste por persona / cenário |

## Comandos (raiz do monorepo)

```powershell
npm run qa:list                          # lista suites e status de automação
npm run qa:run -- --suite <id>           # abre runbook + pré-checks do ambiente
npm run qa:run -- --suite <id> --preview # idem no Ambiente 2 (preview)
npm run qa:run-all -- --lane regression  # orquestra suites da lane regressão (manual)
```

## Relação com docs existentes

| Doc | Papel |
|-----|--------|
| [`TESTING_VERTICALS.md`](../TESTING_VERTICALS.md) | Verticais (funcional / integrado / segurança / performance) antes de Preview |
| [`DELIVERY_PIPELINE.md`](../DELIVERY_PIPELINE.md) | Ciclo entrega + `promotion:gates` |
| [`FEATURE_REVIEW_FRAMEWORK.md`](../FEATURE_REVIEW_FRAMEWORK.md) | Tier 0–3 — reviews legais/médicas; **complementa**, não substitui QA funcional |
| [`features/index.json`](../features/index.json) | Cada feature card deve linkar sua suite QA |

## Estrutura de pastas

```
docs/testing/
├── README.md                 ← este hub
├── QA_PROCESS.md
├── MANUAL_TEST_RUNBOOK.md
├── PARALLEL_QA_MODEL.md
├── AUTOMATION_ROADMAP.md
├── fixtures/
│   ├── README.md
│   ├── core-demo.json
│   └── family-matrix.json
└── suites/
    ├── index.json            ← catálogo
    ├── _TEMPLATE.md
    ├── core-auth-dashboard.md
    ├── family-access-matrix.md
    ├── regression-main.md
    └── …
```

## Ritual ao entregar feature

1. Atualizar feature card com seção **QA** (link para suite).
2. Criar ou atualizar `docs/testing/suites/<suite-id>.md` + entrada em `suites/index.json`.
3. Definir fixture em `docs/testing/fixtures/` se a massa for nova.
4. Marcar `automation.status` (`manual` → `planned` → `partial` → `done`).
5. Quando `done`: spec em `packages/web/e2e/suites/<suite-id>.spec.ts`.
