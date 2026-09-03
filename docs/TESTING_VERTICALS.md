# Verticais de teste — Ambiente 1 (Integração)

> **Última atualização:** 2026-09-02  
> Modelo: [`infra/TWO_ENV_MODEL.md`](./infra/TWO_ENV_MODEL.md) · Relatório: `npm run promotion:gates` → `promotion-report-last.md`

## Objetivo

Antes de pedir aprovação para o **Ambiente 2 (Preview)**, o agente valida cada vertical relevante e entrega só: **passou**, **falhou**, **precisa de decisão**.

---

## Matriz — quando rodar cada vertical

| Vertical | O que cobre | Quando é obrigatório | Comando / artefato |
|----------|-------------|----------------------|-------------------|
| **Funcional** | Lógica de domínio, handlers, UI build | **Sempre** antes de promoção | `cd packages/api && npm run test:critical`; `cd packages/web && npm run build` |
| **Funcional (E2E)** | Fluxo mínimo web (landing/login) | PR que toca web/auth; promoção se E2E instalado | `cd packages/web && npm run test:e2e` |
| Integrado (migrations) | **Sempre** | `validate:migrations` obrigatório |
| Integrado (DB apply/seed) | PG ephemeral (CI) ou refresh Preview | `migrate:all`, `seed:staging-refresh` — opcional em PG dev já migrado |
| **Segurança** | Crypto, compliance gate, sanitização, ops-auth | **Sempre** (subset em critical) | Incluído em `test:critical`; tier ≥ 2 → skills `aiyracare-review-security` |
| **Performance** | Health, latência básica API | Promoção se API acessível; obrigatório no Preview após deploy | `cd packages/api && npm run staging:probe-gate` |

### Por tipo de mudança

| Área tocada | Funcional | Integrado | Segurança extra | Performance |
|-------------|-----------|-----------|-----------------|-------------|
| Só docs / copy | Opcional | — | — | — |
| API domínio | critical + vitest área | se migration | tier ≥ 2 skill | probe se API up |
| Web UI | build + E2E | — | tier ≥ 1 | — |
| Sync / scraper | critical + test portal | seed opcional | legal + security | probe |
| Auth / credenciais | critical | — | **security skill obrigatório** | — |
| Ops / alertas | `test:ops` ou critical | — | ops-auth em critical | probe + `ops:alerts-check` |

---

## Gate agregado (local / CI)

```powershell
# Na raiz do monorepo
$env:DATABASE_URL = "postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare"
npm run promotion:gates
```

Gera `promotion-report-last.md`. Falha com exit code 1 se algum gate **não opcional** falhou.

| Gate | Opcional? |
|------|-----------|
| test:critical | Não |
| web build | Não |
| validate:migrations | Não |
| migrate:all + seed:staging-refresh | Sim (PG dev já migrado ou sem `DATABASE_URL`) |
| test:e2e | Sim (Playwright / browser) |
| staging:probe-gate | Sim (API down) |

---

## O que o agente reporta a Rafael

Formato curto no chat (não dump de logs):

1. **✅ Passou** — lista bullets do que rodou.
2. **❌ Falhou** — comando, erro resumido, hipótese.
3. **⚠️ Decisão** — trade-off, flag, dado de teste, go/no-go manual.
4. Link ou path do `promotion-report-last.md`.

Template manual: [`templates/PROMOTION_REPORT.md`](./templates/PROMOTION_REPORT.md).

---

## Após aprovação

1. Workflow manual `.github/workflows/promote-preview.yml` (Environment `preview`).
2. Post-deploy Preview: `seed:staging-refresh`, `staging:probe-gate`, `ops:alerts-check`.
3. Rafael testa no Ambiente 2 — bugs de produto/UX, não regressões técnicas.

**Local (fase atual):** promoção = `npm run up:preview` após aprovação. **Depois:** mesmo fluxo com deploy GCP — ver `docs/infra/DEPLOY_PREVIEW.md`.

---

## CI

| Workflow | Role |
|----------|------|
| `ci.yml` | Ambiente 1 — build + critical + migrations em cada push/PR |
| `staging.yml` | Build + database-smoke (legado nome; alvo = Preview quando host existir) |
| `promote-preview.yml` | Promoção explícita Ambiente 1 → 2 após aprovação |
