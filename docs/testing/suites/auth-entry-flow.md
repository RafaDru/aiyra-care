# Suite — `auth-entry-flow`

| Campo | Valor |
|-------|--------|
| **ID** | `auth-entry-flow` |
| **Domínio** | `conta` |
| **Lane** | `regression`, `business-full` |
| **Fixture** | `core-demo` (existente) · `qa-onboarding` (wizard) |

Fluxos de **entrada na conta** a partir da landing pública: cliente existente (login) e novo cliente (signup mode + onboarding guiado).

## Pré-requisitos

- [ ] API `:3010` e web `:5173` no ar
- [ ] `npm run qa:create-test-user` + `qa:seed-e2e-account` (cliente existente)
- [ ] `npm run qa:create-onboarding-user` + reset antes do cenário wizard
- [ ] Credenciais em `packages/web/.env.e2e.local`

## Cenários

### A — Cliente existente (login)

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | `/home` → **Entrar** | `/login?mode=login` | |
| 2 | Título «Bem-vindo de volta» | Modo login visível | |
| 3 | Login `qa.e2e@…` | Dashboard com heading **Sua família** | |

**Automação:** `auth-entry-flow.spec.ts` — cenário «cliente existente»

### B — Novo cliente (signup mode, sem criar conta na CI)

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | `/home` → **Criar conta** | `/login?mode=signup` | |
| 2 | Título «Crie sua conta» | Segmented em «Sou novo cliente» | |
| 3 | Formulário signup visível | Botão **Criar conta** | |

> Signup real com e-mail descartável é **opcional** na CI (rate limit Supabase). Copy de confirmação por e-mail aparece no modo signup; ver nota no PR se `email_confirm` não estiver habilitado.

### C — Onboarding guiado (wizard 2 passos)

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Reset `qa:reset-onboarding-user` + login onboarding | Wizard passo 1 | |
| 2 | Perfil titular + **Continuar** | Passo «Quem você acompanha?» | |
| 3 | **Pular por agora** | Dashboard **Sua família** com titular | |

**Automação:** `auth-entry-flow.spec.ts` — cenário «onboarding guiado»

## Matriz

[`BUSINESS_ACTION_MATRIX.md`](../BUSINESS_ACTION_MATRIX.md) — «Onboarding / perfil titular» + entrada auth.

## Comandos

```powershell
npm run qa:reset-onboarding-user   # antes do cenário C
npm run qa:run -- --suite auth-entry-flow
```
