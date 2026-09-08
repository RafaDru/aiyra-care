# Automação QA — manual → Playwright → CI

> **Última atualização:** 2026-09-08

## Fases

| Fase | Entrega | Gate `main` | Status |
|------|---------|-------------|--------|
| **0** | Suites manuais + `npm run qa:run` | — | ✅ |
| **1** | Playwright Onda 1 local (`test:e2e:regression`) | — | ✅ |
| **2** | **CI** `ci-e2e-regression.yml` — PG + API + Playwright Onda 1 | PR/push `main` | ✅ |
| **3** | CI `business-full` (Onda 2) + artifacts | opcional nightly | ⬜ |
| **4** | Ava lane + mocks LLM | — | ⬜ |

## Fase 2 — workflow

Arquivo: [`.github/workflows/ci-e2e-regression.yml`](../../.github/workflows/ci-e2e-regression.yml)

Sequência:

1. Postgres 16 (`aiyracare_e2e`)
2. `npm run migrate:dry-run`
3. `seed-legal-documents.mjs`
4. `qa:create-test-user` + `qa:create-onboarding-user` → `packages/web/.env.e2e.local`
5. API build + `:3010`
6. `npm run test:e2e:regression` (smoke + onboarding + `core-patient-crud`)

### Secrets obrigatórios (GitHub → Settings → Secrets)

| Secret | Uso |
|--------|-----|
| `SUPABASE_URL` | API auth + scripts QA |
| `SUPABASE_SERVICE_ROLE` | Admin API — criar usuários QA |
| `VITE_SUPABASE_ANON_KEY` | Web preview + login Playwright |

Sem esses secrets o job **é ignorado** (warning no log) — configure no fork/repo antes de exigir gate obrigatório.

### Reproduzir localmente

```powershell
# Com API já em :3010 após migrate/seed/users:
$env:DATABASE_URL="postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare"
$env:CRYPTO_KEY="..."   # 64 hex do .env
$env:SUPABASE_URL="..."
$env:SUPABASE_SERVICE_ROLE="..."
$env:VITE_SUPABASE_ANON_KEY="..."
npm run test:e2e:ci
# ou stack completo:
npm run test:e2e:ci:full
```

## CI existente (`ci.yml`)

| Job | Escopo |
|-----|--------|
| `api` | build + critical + ops |
| `migrations` | dry-run PG |
| `web` | Playwright **smoke** apenas (sem Supabase) |
| `agents` | import Python |

## Próximo (Fase 3)

Ver seção completa abaixo.

---

## Fase 3 — CI `business-full` (Onda 2 Playwright)

### Objetivo

Rodar no GitHub Actions a mesma lane que já passa localmente:

```powershell
npm run test:e2e:business-full   # 11 specs, ~2,5 min local (API+web já no ar)
```

| Lane | Specs | Tempo típico | Gate sugerido |
|------|-------|--------------|---------------|
| `regression` (Fase 2) | 3 | ~1,5 min | **Obrigatório** em PR/push `main` |
| `business-full` (Fase 3) | 11 | ~8–12 min no CI (build web + PG) | **Nightly** → depois opcional em PR |

### Os 11 specs

**Onda 1 (já na Fase 2):**

1. `smoke.spec.ts`
2. `onboarding.spec.ts`
3. `suites/core-patient-crud.spec.ts`

**Onda 2 (incremento Fase 3):**

4. `patient-exams-crud` — CRUD exame manual
5. `patient-medications-crud` — criar / editar / desativar
6. `patient-documents-crud` — upload PDF + OCR review + delete
7. `integrations-link-sync` — vínculo manual Bradesco
8. `support-user-report` — modal reportar problema
9. `family-access-matrix` — `/settings/family` + seed matriz
10. `hygiene-dedup-ui` — candidato duplicado + dismiss

### Setup extra vs Fase 2

Mesma base (PG, migrate, legal, `qa:create-*-user`, API `:3010`), **mais**:

| Passo | Quando | Script |
|-------|--------|--------|
| Seed matriz família | `beforeAll` do spec família | `npm run seed:qa-family-matrix` |
| Verificar matriz | idem | `npm run qa:verify-family-matrix` |
| Candidato higiene | `beforeAll` hygiene spec | `npm run qa:seed-hygiene-candidate` |
| Compliance conta QA | cada spec autenticado | `qa:seed-e2e-account` (via `ensureQaE2eSession`) |
| Reset onboarding | cada teste onboarding | `qa:reset-onboarding-user` |

**Fixture de arquivo:** `patient-documents-crud` precisa de PDF em `packages/web/e2e/fixtures/` (commitado no repo, sem PHI).

### Workflow proposto

Arquivo sugerido: `.github/workflows/ci-e2e-business-full.yml`

```yaml
on:
  schedule:
    - cron: '0 5 * * *'      # 05:00 UTC — após merges do dia anterior
  workflow_dispatch: {}     # re-run manual
  # pull_request:            # habilitar só após flake < 2% em nightly
```

**Job:** copiar `ci-e2e-regression.yml` e trocar o último step:

```yaml
- run: npm run test:e2e:business-full
```

**Ajustes recomendados:**

| Parâmetro | Valor | Motivo |
|-----------|-------|--------|
| `timeout-minutes` | 35–45 | build Vite + 11 specs sequenciais |
| `workers` | 1 (já no config) | onboarding reset + massa `QA-*` |
| `retries` | 1 (já no config) | flakes de rede/UI |
| Artifacts | `playwright-report/`, `test-results/` | trace/screenshot só em falha |
| `trace` | `retain-on-failure` no CI | debug sem inflar sucesso |

Script local espelho: `scripts/ci-e2e-business-full.mjs` + `npm run test:e2e:ci:business-full`.

### Secrets e ambiente

Idênticos à Fase 2 — **não** precisa de secrets novos para Onda 2 atual.

Futuro (matriz família **completa**, 5 logins distintos): criar personas Supabase dedicadas (`qa.family.owner@…`, etc.) via script `link-qa-persona.mjs` — hoje o spec valida só smoke da tela com conta `qa.e2e`.

### Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| Flake em upload/OCR | PDF fixo pequeno; timeout 90s; retry 1 |
| Onboarding + PG reset lento | manter `workers: 1`; não paralelizar onboarding |
| CI lento em PR | nightly primeiro; path filter `packages/web/**` se habilitar em PR |
| Supabase rate limit | usuários QA fixos (update senha, não recreate em massa) |
| `family-access-matrix` evoluir para 5 personas | épico `qa-e2e-family-matrix` — job separado ou shard |

### Critérios para promover a gate obrigatório

1. **7 noites** consecutivas verdes no nightly (ou 14 runs `workflow_dispatch`).
2. Tempo médio estável **&lt; 15 min**.
3. Zero flake recorrente no mesmo spec (rastrear via artifact).
4. Marcar check required em *Branch protection* junto com `e2e-regression`.

### Fora do escopo da Fase 3

- **Onda 3 Ava** → Fase 4 (`AVA_TEST_MODE`, mock SSE) — ver [`AVA_QA_SCOPE.md`](./AVA_QA_SCOPE.md)
- Portais reais (Amil/Unimed sync) — manual ou mock HTTP
- `compliance-gate-ui` — manual (checkbox Ant Design)

### Roadmap

| Item | Após Fase 3 |
|------|-------------|
| `qa-ci-business-full` | workflow nightly + artifacts |
| `qa-seed-family-matrix` | marcar done (script existe) |
| `qa-e2e-family-matrix` | partial → done (smoke UI); full matrix = épico seguinte |

Ver [`PLAYWRIGHT_FLOWS.md`](./PLAYWRIGHT_FLOWS.md).

