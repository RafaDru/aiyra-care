# Autenticação em testes QA / E2E

> **Última atualização:** 2026-09-08  
> **Decisão:** regressão e teste completo usam **e-mail + senha** (Supabase). Login social (Google/Microsoft) **fora** do gate automático até existir conta de teste dedicada.

## Login “mock” — o que existe e o que não existe

| Abordagem | Viável? | Notas |
|-----------|---------|-------|
| Botão “login fake” no app | ❌ | Não implementar bypass em prod/preview |
| Google “login social fake” | ❌ | Não existe API de mock; só OAuth real |
| Google OAuth **modo Testing** + usuários teste | 🟡 | Ainda abre tela Google; útil para humano, ruim para CI headless |
| Microsoft **tenant dev** + usuários teste | 🟡 | Idem — OAuth real |
| **Supabase e-mail/senha** | ✅ | Já na UI `/login` — `signInWithPassword` |
| Playwright **storageState** (sessão salva) | ✅ | Login 1× → reutiliza cookie/localStorage |
| Supabase **Admin API** criar usuário CI | ✅ | Script com `service_role` (só CI, secrets) |

Referência produto: [`SUPABASE.md`](../SUPABASE.md).

---

## Estratégia adotada (agora)

### 1. Conta QA dedicada (manual + E2E)

**Criar/atualizar via script** (usa `SUPABASE_SERVICE_ROLE` do `.env`):

```powershell
npm run qa:create-test-user
# opcional: npm run qa:create-test-user -- --email=qa+dev@seudominio.com
```

Grava credenciais em `packages/web/.env.e2e.local` (gitignored).

**Onboarding (fluxo repetível):**

```powershell
npm run qa:create-onboarding-user
npm run qa:reset-onboarding-user   # antes de cada run E2E do cenário login
cd packages/web && npm run test:e2e -- onboarding.spec.ts
```

Ver [`suites/onboarding-flow.md`](./suites/onboarding-flow.md).

Ou manualmente no Supabase Dashboard → **Authentication → Users** → **Add user**.

**Credenciais nunca no git** — só em `.env.e2e.local` (gitignored) ou secrets CI.

### 2. Variáveis para Playwright / agente

Copiar `packages/web/.env.e2e.example` → `packages/web/.env.e2e.local`:

```env
QA_TEST_EMAIL=qa+dev@example.com
QA_TEST_PASSWORD=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Helper: `packages/web/e2e/helpers/login.ts` — `loginViaPassword(page)`.

### 3. O que testamos vs adiamos

| Suite | Auth |
|-------|------|
| `regression-smoke` | Não precisa (público) |
| `onboarding-flow` | Conta **dedicada** `qa.onboarding@…` + reset antes do run |
| `core-patient-crud`, `business-full`, `ava-*` | **E-mail/senha** QA (`qa.e2e@…`) |
| `auth-oauth-google` (futuro) | Manual; conta Google teste |
| `auth-oauth-microsoft` (futuro) | Manual; tenant/conta teste |

---

## Playwright — fluxo recomendado

```typescript
// e2e/helpers/login.ts
import { loginViaPassword } from './helpers/login.js'

test.beforeEach(async ({ page }) => {
  await loginViaPassword(page)
})
```

Alternativa CI: job gera `playwright/.auth/user.json` via `globalSetup` + Admin API (épico `qa-e2e-platform`).

---

## Login social — quando você tiver e-mail teste

1. Criar projeto Google Cloud OAuth em modo **Testing** + adicionar e-mail como test user.  
2. (Opcional) Tenant Microsoft dev para Azure.  
3. Suite manual `auth-oauth-smoke.md` — **um** login humano por release, não no `main` gate.

Não substitui conta e-mail/senha QA para CRUD automatizado.

---

## Segurança

- `QA_TEST_*` só em `.env.e2e.local` e GitHub Secrets.  
- Nunca `service_role` no frontend ou Playwright no dev local do Rafael sem necessidade.  
- Conta QA só em projeto Supabase **dev**; preview com usuário separado se possível.

## Ver também

- [`fixtures/qa-test-user.json`](./fixtures/qa-test-user.json) — metadados (sem senha)  
- [`suites/core-patient-crud.md`](./suites/core-patient-crud.md)
