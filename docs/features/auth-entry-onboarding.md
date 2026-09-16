# Entrada auth e onboarding guiado

| Campo | Valor |
|-------|--------|
| **ID** | `auth-entry-onboarding` |
| **Épico** | `institutional-landing` |
| **Status** | `done` |
| **Categoria** | negócio |
| **Prioridade** | P1 |

## Resumo

Fluxo B2C de entrada: landing → login/signup com modo na URL → wizard de onboarding em 2 passos (perfil titular + dependentes opcionais) → dashboard «Sua família».

## Comportamento

1. **Login** (`?mode=login`): título «Bem-vindo de volta»; após auth → compliance (se pendente) → dashboard ou onboarding se `needsProfile`
2. **Signup** (`?mode=signup`): título «Crie sua conta»; copy de confirmação por e-mail (informativo); após signup → `/onboarding`
3. **Onboarding passo 1:** perfil titular (CPF obrigatório; CNS opcional; peso/altura opcionais)
4. **Onboarding passo 2:** adicionar dependentes via `POST /patients` ou pular

## Telemetria

`onboarding_step` — `step_1_viewed`, `profile_complete`, `step_2_viewed`, `dependent_added`, `dependents_skipped`, `dependents_complete`

## Superfície técnica

| Tipo | Referência |
|------|------------|
| Rotas | `/home`, `/login`, `/onboarding` |
| UI | `landing.tsx`, `login.tsx`, `onboarding.tsx` |
| i18n | `auth.*`, `onboarding.*`, `patient.title`, `nav.dashboard` |

## Gap conhecido

Confirmação de e-mail Supabase: copy informativa na UI; fluxo não bloqueia se `email_confirm` desabilitado no projeto.

## QA

Suite dedicada: [`auth-entry-flow`](../testing/suites/auth-entry-flow.md)

```powershell
npm run qa:run -- --suite auth-entry-flow
```
