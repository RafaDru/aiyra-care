# Roadmap de automação QA

> **Última atualização:** 2026-09-08  
> A suite manual é a fonte de verdade; automação **converge** para o mesmo `suite-id`.

## Estados de automação

| `automation.status` | Significado |
|---------------------|-------------|
| `manual` | Só checklist `.md` |
| `planned` | Checklist pronto; spec Playwright não iniciado |
| `partial` | Alguns passos automatizados |
| `done` | Spec cobre todos os passos obrigatórios da suite |
| `blocked` | Dependência externa (portal WAF, etc.) — permanece manual |

Registrar em `docs/testing/suites/index.json`.

## Fases

### Fase 0 — Hoje ✅

- [x] Processo documentado (`docs/testing/*`)
- [x] Catálogo de suites + fixtures
- [x] CLI `npm run qa:list` / `qa:run` / `qa:run-all`
- [x] Smoke Playwright (`e2e/smoke.spec.ts`) no CI — **sem API**

### Fase 1 — Infra integrada (próximo)

- [ ] `packages/api/scripts/seed-qa-family-matrix.mjs`
- [ ] `packages/web/e2e/helpers/auth.ts` — login Supabase test user
- [ ] `packages/web/e2e/suites/core-auth-dashboard.spec.ts`
- [ ] Documentar env vars `QA_*` em `docs/infra/ENV_INTEGRATION.md`

### Fase 2 — Regressão CI

- [ ] Workflow `ci-e2e-regression.yml`: services postgres → migrate → seed → API → playwright
- [ ] Suites lane `regression` com `automation.status: done`
- [ ] Bloquear merge em `main` se regressão falhar

### Fase 3 — Paralelo no CI

- [ ] Job matrix por suite `parallelSafe: true`
- [ ] Fixture efêmera por job
- [ ] Relatório agregado (GitHub summary)

### Fase 4 — Portal / não determinístico

- [ ] Mocks HTTP para sync em CI
- [ ] Lane `integration-portal` manual + nightly opcional com secrets

## Mapeamento arquivo

| Manual | Automatizado |
|--------|--------------|
| `docs/testing/suites/<id>.md` | `packages/web/e2e/suites/<id>.spec.ts` |
| `docs/testing/fixtures/<id>.json` | `packages/api/scripts/seed-qa-<id>.mjs` |
| `suites/index.json` | `playwright.config.ts` projects (futuro) |

## Critério “pronto para automação”

Uma suite pode ir para Fase 1 quando:

1. Passos numerados e determinísticos (sem “avalie se parece ok”)
2. Fixture aplicável via script idempotente
3. Seletores estáveis documentados na suite (data-testid preferido)
4. Pelo menos 1 execução manual PASS documentada

## O que não automatizar (curto prazo)

- Qualidade narrativa das respostas Ava
- Fluxo completo gov.br / ConecteSUS interativo
- Login Amil com WAF (manter lane `integration-portal` manual + mock em CI)
