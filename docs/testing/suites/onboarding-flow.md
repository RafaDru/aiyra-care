# Suite — `onboarding-flow`

| Campo | Valor |
|-------|--------|
| **ID** | `onboarding-flow` |
| **Domínio** | `conta` |
| **Lane** | `regression`, `business-full` |
| **Fixture** | [`qa-onboarding`](../fixtures/qa-onboarding.json) |

Fluxo completo de **primeiro acesso**: compliance (quando pendente) → formulário de onboarding → dashboard com perfil titular (`self`).

## Pré-requisitos

- [ ] API `:3010` e web `:5173` (ou preview `:5174`) no ar
- [ ] `npm run qa:create-onboarding-user` (uma vez)
- [ ] **Antes de cada run automatizado:** `npm run qa:reset-onboarding-user`
- [ ] Credenciais em `packages/web/.env.e2e.local`

## Cenários

### A — Login + compliance + onboarding (gate regressão)

Conta dedicada `qa.onboarding@aiyracare.local`, estado resetado no PG.

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Reset fixture (`qa:reset-onboarding-user`) | Sem membership `self`; aceites legais limpos | |
| 2 | Login e-mail/senha | Redireciona para `/compliance/accept` ou `/onboarding` | |
| 3 | Aceitar termos (se gate) | Avança para `/onboarding` | |
| 4 | Preencher nome, nascimento ≥18, sexo, CPF | Validação OK | |
| 5 | **Concluir cadastro** | Dashboard `/` com card do titular | |

**Automação:** `packages/web/e2e/onboarding.spec.ts` (cenário A)

### B — Signup + onboarding (conta nova) — **manual**

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | `/login` → **Criar uma conta** | Modo signup | |
| 2 | E-mail único + senha + checkbox legal | Conta criada | |
| 3 | Onboarding (mesmos campos) | Dashboard com paciente titular | |

> Signup via UI fora do gate E2E automático no dev (rate limit Supabase). Use conta dedicada + reset (cenário A) na CI.

### C — Bloqueio menor de 18 (manual rápido)

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Data nascimento &lt; 18 anos | Mensagem «maiores de 18 anos» | |

## Matriz

[`BUSINESS_ACTION_MATRIX.md`](../BUSINESS_ACTION_MATRIX.md) — «Onboarding / perfil titular».

## Comandos

```powershell
npm run qa:reset-onboarding-user
cd packages/web && npm run test:e2e -- onboarding.spec.ts
```
