# Playwright — mapa de fluxos e plano de implementação

> **Última atualização:** 2026-09-08  
> Fonte de verdade operacional: [`suites/index.json`](./suites/index.json) + [`BUSINESS_ACTION_MATRIX.md`](./BUSINESS_ACTION_MATRIX.md).

## Arquitetura

```
packages/web/e2e/
├── global-setup.ts          # pré-voo API + env
├── smoke.spec.ts            # público, sem auth
├── onboarding.spec.ts       # conta dedicada, reset PG
├── helpers/
│   ├── env.ts               # .env.e2e.local
│   ├── auth.ts              # login e-mail/senha
│   ├── onboarding.ts        # formulário titular
│   ├── session.ts           # ensureQaE2eSession (compliance + onboarding)
│   ├── navigation.ts        # gotoPatientTab, gotoFamilySettings
│   ├── clinical.ts          # exames, meds, docs, integrações
│   └── patient.ts           # CRUD dashboard/perfil
└── suites/
    ├── core-patient-crud.spec.ts   # Wave 1
    ├── family-access-matrix.spec.ts # Wave 2
    └── …
```

| Conta Supabase | Uso | Script |
|----------------|-----|--------|
| `qa.e2e@aiyracare.local` | CRUD paciente, Ava, business-full | `npm run qa:create-test-user` + `qa:seed-e2e-account` |
| `qa.onboarding@aiyracare.local` | Onboarding repetível | `npm run qa:create-onboarding-user` + `qa:reset-onboarding-user` |

**Pré-requisitos locais:** API `:3010`, PG migrado, `packages/web/.env.e2e.local` (ver [`AUTH_TESTING.md`](./AUTH_TESTING.md)).

**Comando gate regressão:**

```powershell
npm run test:e2e:regression
npm run test:e2e:business-full   # Onda 1 + Onda 2
```

---

## Tabela master — suite → Playwright

Legenda **status:** ✅ done · 🟡 partial · ⬜ planned · 🚫 blocked · 👁 manual-only

| Onda | Suite | Spec Playwright | Auth | Fixture | Status | Notas |
|------|-------|-----------------|------|---------|--------|-------|
| **1** | `regression-smoke` | `e2e/smoke.spec.ts` | — | — | ✅ | Login + landing; sem API |
| **1** | `onboarding-flow` | `e2e/onboarding.spec.ts` | onboarding | `qa-onboarding` | ✅ | Reset PG re-seeda compliance; signup UI = manual |
| **1** | `core-patient-crud` | `e2e/suites/core-patient-crud.spec.ts` | qa.e2e | `core-demo` | ✅ | `ensureQaE2eSession` + seed compliance |
| **2** | `family-access-matrix` | `e2e/suites/family-access-matrix.spec.ts` | 5 personas | `family-matrix` | 🟡 | seed PG + smoke UI `/settings/family` |
| **2** | `patient-exams-crud` | `e2e/suites/patient-exams-crud.spec.ts` | qa.e2e | `core-demo` | ✅ | Criar exame manual |
| **2** | `patient-documents-crud` | `e2e/suites/patient-documents-crud.spec.ts` | qa.e2e | `core-demo` | ✅ | Upload + delete |
| **2** | `patient-medications-crud` | `e2e/suites/patient-medications-crud.spec.ts` | qa.e2e | `core-demo` | ✅ | Criar, editar, desativar |
| **2** | `integrations-link-sync` | `e2e/suites/integrations-link-sync.spec.ts` | qa.e2e | `core-demo` | ✅ | Bradesco vínculo manual |
| **2** | `hygiene-dedup-ui` | `e2e/suites/hygiene-dedup-ui.spec.ts` | qa.e2e | seed hygiene | ✅ | `qa:seed-hygiene-candidate` |
| **2** | `support-user-report` | `e2e/suites/support-user-report.spec.ts` | qa.e2e | — | ✅ | Modal reportar |
| **3** | `ava-companion-smoke` | `e2e/suites/ava-companion-smoke.spec.ts` | qa.e2e | `core-demo` | ⬜ | Mock LLM futuro |
| **3** | `ava-guardrail-smoke` | `e2e/suites/ava-guardrail-smoke.spec.ts` | qa.e2e | — | ⬜ | Off-topic sem LLM |
| **3** | `ava-conversation-crud` | `e2e/suites/ava-conversation-crud.spec.ts` | qa.e2e | — | ⬜ | |
| **—** | `compliance-gate-ui` | `e2e/suites/compliance-gate.spec.ts` | fresh user | — | 👁 | Checkbox Ant Design — manual |
| **—** | `settings-account` | `e2e/suites/settings-account.spec.ts` | qa.e2e | — | ⬜ | Perfil cuidador |
| **—** | `patient-wallet` | `e2e/suites/patient-wallet.spec.ts` | qa.e2e | demo links | ⬜ | |
| **—** | `patient-vaccines-crud` | `e2e/suites/patient-vaccines-crud.spec.ts` | qa.e2e | — | ⬜ | Matriz ⬜ |
| **—** | `patient-measurements-crud` | `e2e/suites/patient-measurements-crud.spec.ts` | qa.e2e | — | ⬜ | |
| **—** | `patient-clinical-export` | `e2e/suites/patient-clinical-export.spec.ts` | qa.e2e | — | ⬜ | |
| **4** | `amil-sync-options` | — | portal | `portal-amil-qa` | 🚫 | WAF — manual + nightly opcional |
| **4** | `ops-health` | `packages/api/scripts/ops-smoke.ts` | ops key | — | 🟡 | HTTP, não browser |

---

## Ondas de entrega

### Onda 1 — Lane `regression` (agora)

Objetivo: `npm run test:e2e:regression` verde localmente; base para CI Fase 2.

1. Infra helpers + scripts `qa:*-user`
2. `onboarding.spec.ts` estável (workers=1, reset PG)
3. `core-patient-crud.spec.ts` — criar adulto/menor, editar, excluir, cleanup `QA-*`

### Onda 2 — Lane `business-full` (perfil + plataforma)

Uma spec por domínio em `e2e/suites/`; `npm run test:e2e:business-full`.

**Status (2026-09-08):** `11/11` verde — Onda 1 + 7 specs Onda 2 (`patient-exams/medications/documents`, `integrations-link-sync`, `support-user-report`, `family-access-matrix`, `hygiene-dedup-ui`).

Correções de produto descobertas nos E2E: `IntegrationsTab` loop de render (`useMemo` em `syncTargets`); upload clínico sem `Authorization` em `document-upload.ts`.

### Onda 3 — Lane `ava`

Smoke operacional sem assert de qualidade LLM — ver [`AVA_QA_SCOPE.md`](./AVA_QA_SCOPE.md).  
Requer `AVA_TEST_MODE=1` ou mock SSE na API (épico `qa-e2e-platform`).

### Onda 4 — Portais e ops

- Portais: manual ou mock HTTP em CI
- Ops: manter `ops-smoke.ts` fora do Playwright

---

## Padrões técnicos

| Regra | Detalhe |
|-------|---------|
| Massa | Prefixo `QA-` + sufixo data/`Date.now()` |
| CPF | `uniqueQaCpf()` — 11 dígitos únicos por run |
| Data mascarada | `fill` + `Tab` para commit do `MaskedDatePicker` |
| Checkbox Ant Design | `.ant-checkbox-wrapper` ou `getByText` no label |
| Delete | `Popconfirm` → botão primário do popover |
| Cleanup | Spec remove todos os `QA-*` que criou |
| Compliance E2E | Reset PG re-seeda aceites; gate UI em spec dedicada manual |
| OAuth | Fora do Playwright — [`AUTH_TESTING.md`](./AUTH_TESTING.md) |

### Seletores (evolução)

Prioridade futura: `data-testid` em fluxos críticos (`patient-create-submit`, `onboarding-submit`). Hoje: roles/labels i18n pt-BR.

---

## CI (Fase 2 — [`AUTOMATION_ROADMAP.md`](./AUTOMATION_ROADMAP.md))

Workflow: [`.github/workflows/ci-e2e-regression.yml`](../../.github/workflows/ci-e2e-regression.yml)

```
PG → migrate → seed legal → qa:create-*-user → API :3010 → test:e2e:regression
```

Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`, `VITE_SUPABASE_ANON_KEY`.

Local (API já no ar): `npm run test:e2e:ci` · stack completo: `npm run test:e2e:ci:full`.

---

## Ritual ao adicionar spec

1. Suite `.md` com passos numerados ✅
2. Entrada `suites/index.json` com `automation.spec`
3. Spec em `e2e/suites/<id>.spec.ts`
4. `automation.status`: `planned` → `partial` → `done`
5. Rodar `npm run test:e2e:regression` ou suite isolada
6. Link na feature card (seção QA)
